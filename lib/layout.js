const Map = require ('../lib/aatree')
const compareJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

// `layout`, is a very simple table layout algorithm. 
// It takes a layered map of nodes and computes their (x,y) positions. 
// It horizontally spaces out the nodes in each row 

// `conf` is an object { node_width, node_height }
// `layers` is an object { width: number, layers: Map <int,any> }
// where table is a map from a 'rank' to a row of nodes,
// and width is the number of nodes in the longest row in the table.  

function layout (conf, layers) {
	var table = layers.layers
		, columns = layers.width
		, row_count = 0
		, nw = conf.node_width
    , nh = conf.node_height
		, w = columns * nw
		, positions = []

	function fn (row, row_key) {
		row_count++
		var s = row.length
		for (var i=0,l=row.length; i<l; i++)
			positions[row[i]] = { x:(w/s)*(i+.5), y:(row_count-.5)*nh } }

	table.forEach (fn)
	return { left:0, top:0, right:w, bottom:row_count*nh, columns:columns, rows:row_count, positions:positions } }


// `layout2` is a little more advanced, it has parameterizable node sizes.
// TODO cleanup and make a subgraph drawing algorithm. 

function layout2 (toDim, grouped, heap) {
  var rows = []
    , positions = []
    , width = 0
    , height = 0
  
	grouped.layers.forEach (function (row, row_key) {
    var w = 0, h = 0
		for (var i=0, l=row.length; i<l; i++) {
		  var pic = toDim (heap[row[i]]) // row[i]:X --> heap[row[i]]::GX
      w += pic.width
      h = Math.max (h, pic.height)
    }
    rows.push ({ width:w, height:h, axis:height+(h/2), items:row })
    height += h
    width = Math.max (w, width) } )

  rows.map (function (info) {
    var row = info.items
    var space = (width - info.width) / row.length
    var w = 0
		for (var i=0,l=row.length; i<l; i++) {
      var pic = toDim (heap[row[i]]) // row[i]:X --> heap[row[i]]::GX
      var x = (i+.5) * space + w + pic.width/2
      w += pic.width
      positions[row[i]] = { x:x, y:info.axis }
    }
  })

  return { left:0, top:0, right:width, bottom:height, positions } }


// `group_by` takes a heap of nodes, and produces a layering of its nodes. 
// This is the basis for a layered-graph drawing algorithm. 
// Given a functor `F`, it groups nodes by their algebraic `rank`, which is
// simply an F-algebra, and furthermore, compares ranks according to 
// a comparison function `cmp`. 

// It returns a 'grouping', that is, an object { layers, width, ranks }
// where layers is a map from ranks to layers, being an array of node-ids
// width is the length of the longest row
// ranks is a map from node-ids to their rank

// NB this 'heap' is assumed to be something a bit more specific,
// namely, pointers ought to only ever point back to lower indices
// ... it is the format I was using for the maximally shared heaps
// but it's rather specific here so I would like to change that,
// clean it up. Basically, it should be able to work with any algebra/ store. 

function group_by (G, cmp, alg, heap) {
	var table = new Map (cmp) // Map from a rank to an array of nodes
	var columns = 1 // size of the longest column
	var r = []   // stores ranks; r[i] == rank (heap[i]
  var Gfn = G (x => r[x]) // subnode dereference

  for (var i=0, l=heap.length; i<l; i++) { // Apply a fast-fold to the entire heap
		r.push (alg (Gfn (heap[i]))) // compute the rank
		var ptr = table.lookup (r[i]) // find the row for that rank in the table
		if (!ptr.found) table = ptr.set ([i]) // create it if absent otherwise update
		else {
			columns = Math.max (columns, ptr.value.length+1)
			ptr.value.push (i) } }
	return { layers:table, width:columns, ranks:r } }


// The rank function is an algebraic semantics
// what then, is the corank function? It is a decorating function, thus, 
// takes color*seed -> G(color*seed), so DGX -> GDX, where D is 
// the decorator DX := C*X, for C the set of colours (decorators). 
// Then, to decorate a rooted coterm (X, out: X -> GX, start: 1 -> X) we need
// a start colour and a map DGX -> GDX. This is similar to decorating terms
// with their sorts, coalgebraically. 

const D = fn => dx =>
  [ dx[0], fn (dx[1]) ]


// Group by corank, takes:
// a functor G (the node-types)
// a comparison cmp on decorators
// a root state x
// a coalgebra out: X -> GX (the pointer structure)
// the root decoration d
// and a childnode decoration function decorate: DGX -> GDX

function group_by_corank (G, cmp, decorate, out, d, x) {
  var colors = new Map (compareJs) // Map from elements to their colour
  var table = new Map (cmp) // Map from colours to arrays of elements
  var columns = 1

  function trace (dx) {
    var cursor = colors.lookup (dx[1])
    if (cursor.found) return // Prevent cycles -- the first color sticks

    colors = cursor.set (dx[1], dx[0])
    var cursor = table.lookup (dx[0])
		if (!cursor.found)
      table = cursor.set ([dx[1]]) // create row if absent
		else {
			cursor.value.push (dx[1]) // else just add
    	columns = Math.max (columns, cursor.value.length) }
    return G (trace) (decorate (D (out) (dx))) }

  trace ([d, x]) // fills the maps
  return { layers:table, width:columns, ranks:colors } }


// ## Canvas
// (svg generator)

var unitRect = { left:0, right:0, top:0, bottom:0 }

function Canvas (min_bounds) {
	var rect = arguments.length ? min_bounds : unitRect
		, nodes = [], arcs = [], labels = []

  this.render = function render () {
  	var w = rect.right - rect.left, h = rect.bottom - rect.top
  	return '<svg width="'+_round(w)+'" height="'+_round(h)+'"><g transform="translate('+_round(-rect.left)+' '+(-rect.top)+')">\n'
  		+ arcs.join('') + nodes.join('') + labels.join('') + '</g></svg>\n' }

  // make bounds include a rect around origin
  this.stub = function stub (width, height) {
  	rect = grow (rect, { x:width/2, y:height/2 })
  	rect = grow (rect, { x:-width/2, y:-height/2 }) }

  this.use = function use (use, p) {
  	nodes.push ('<use xlink:href="#'+use+'" x="'+p.x+'" y="'+p.y+'" />\n') }

  this.hline = function hline (name, p, w) {
  	nodes.push ('<line class="'+name+'" x1="'+(p.x-w/2)+'" x2="'+(p.x+w/2)+'" y1="'+p.y+'" y2="'+p.y+'"/>\n') }

  this.circle = function circle (name, p, r) {
  	nodes.push ('<circle class="'+name+'" r="'+r+'" cx="'+p.x+'" cy="'+p.y+'" />\n') }

  this.rect = function rect (name, p, w, h) {
    var h = arguments.length > 3 ? h : w
    var x = p.x - .5*w, y = p.y-.5*h
  	nodes.push ('<rect class="'+name+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" />\n') }

  this.path = function path (name, p, d) {
    var d = 'M'+p.x+' '+p.y+' '+d // TODO should we format/ escape d?
  	nodes.push ('<path class="'+name+'" d="'+d+'" />\n') }

  this.arc = function arc (name, p1, a, p2, _s, _o) {
    var _s = typeof _s === 'number' ? _s : .72
    var _o = typeof _o === 'number' ? _o : 10
  	var h1 = mova(p1, a, _o), h = mova(p1, a, distance(p1, p2)*_s)
  	rect = grow (rect, h)
  	var d = ['M', p1.x, p1.y, 'L', h1.x, h1.y, 'Q', h.x, h.y, p2.x, p2.y].map(_round).join(' ')
  	arcs.push ('<path class="'+name+'" d="'+d+'" />\n') }

  this.label = function label (name, text, p) { // FIXME escape text
  	labels.push ('<text class="'+name+'" x="'+p.x+'" y="'+(p.y-1.3)+'">'+text+'</text>\n') }
}

function _round (n) {
	return typeof n === 'number' ? Math.round(100*n)/100 : n }


// ## Geometry

// var Geom =
// { distance: distance
// , mova: mova
// , unitRect: unitRect
// , grow: grow // rect
// , join: join // rect
// }

function distance (p1, p2) { // assuming all positive
	var w = p1.x > p2.x ? p1.x-p2.x : p2.x-p1.x
	var h = p1.y > p2.y ? p1.y-p2.y : p2.y-p1.y
	return Math.sqrt(w*w+h*h) }

function mova (p, a, d) { // @return point at distance d from p in direction a (clockwise turns)
	var a_ = a * (Math.PI * 2)
	var dy = Math.cos (a_) * -d
	var dx = Math.sin (a_) * d
	return { x: p.x + dx, y: p.y + dy} }

function grow (rect, p) { // make rect include point p
	return { left: Math.min (rect.left, p.x)
		, right: Math.max (rect.right, p.x)
		, top: Math.min (rect.top, p.y)
		, bottom: Math.max (rect.bottom, p.y) } }

function join (rect, rect2) { // bounding rect around rect and rect2
	return { left: Math.min (rect.left, rect2.left)
		, right: Math.max (rect.right, rect2.right)
		, top: Math.min (rect.top, rect2.top)
		, bottom: Math.max (rect.bottom, rect2.bottom) } }


module.exports = 
  { Canvas, layout, layout2, group_by, group_by_corank }

