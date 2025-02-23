"use strict"
const AATree = require ('../lib/aatree.js')
const log = console.log.bind (console)
const compareJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

// Group by rank/ by algebraic interpretation
// ------------------------------------------
// This groups nodes into layers according to an algebraic 
// interpretation and a compare function that defines a total order
// on those interpretations. 

function groupByRank (G, cmp, alg, heap) {
  const Gfn = G (x => ranks[x])            // subnode dereference
	const ranks = []                         // stores ranks; r[i] == rank (heap[i])
	let table = new AATree (cmp)             // Map from a rank to an array of nodes
  for (var i=0, l=heap.length; i<l; i++) { // Apply a fast-fold to the entire heap
		ranks.push (alg (Gfn (heap[i])))       // compute the rank
		var ptr = table.lookup (ranks[i])      // find the row for that rank in the table
		if (!ptr.found) table = ptr.set ([i])  // create it if absent otherwise update
		else ptr.value.push (i)
  }
	return table
}

// Fine, now
// rather do it through a hylo


// Group by corank/ coalgebraic decoration function
// ------------------------------------------------
// This groups the node into layers according to their context,
// as specified by a context/ decoration function. 
// It takes:
// - a root state x: X
// - a functor G (the node-types)
// - a coalgebra out: X -> GX (the pointer structure)
// - a root decorator d: D (the supplied root context)
// - a comparison cmpD: D -> 3 on decorators (total order on decorations)
// - a childnode decoration function decorate: DGX -> GDX

const D = fn => dx =>
  [ dx[0], fn (dx[1]) ]

function groupByCorank (G, cmpD, decorate, out, d, x) {
  let colors = new AATree (compareJs) // Map from elements to their colour
  let table = new AATree (cmpD) // Map from colours to arrays of elements
  let columns = 1

  function trace (dx) {
    var cursor = colors.lookup (dx[1])
    if (cursor.found) return // Prevent cycles -- the first color sticks

    colors = cursor.set (dx[1], dx[0])
    var cursor = table.lookup (dx[0])
		if (!cursor.found)
      table = cursor.set ([ dx[1] ]) // create row if absent
		else {
			cursor.value.push (dx[1]) // else just add
    	columns = Math.max (columns, cursor.value.length)
      // SO actually we can already compute the width here, if we know the
      // pictures already here.
    }
    return G (trace) (decorate (D (out) (dx))) }

  trace ([d, x]) // fills the maps
  return { layers:table, width:columns, ranks:colors } }


// Layered Graph Layout
// --------------------
// Takes a layered map of nodes and computes their (x,y) positions. 
// It horizontally spaces out the nodes in each row. 

class Row { // Non-placed; so; dimensions of a rect; with items

  constructor (width = 0, height = 0, depth = 0, items = []) {
    this.width = width
    this.height = height
    this.depth = depth
    this.items = items
  }

  add (item) {
    const { pic } = item
    this.width += pic.width
    this.height = Math.max (this.height, pic.height)
    this.depth = Math.max (this.depth, pic.depth)
    this.items.push (item)
    return this
  }

}

// picFor is a function that returns node 'pictures'
// for the nodes to be drawn; with a shape, width height, depth. 
// grouped; is a filled out table: 

function layout2 (layers, picFor, getSub = (o, k) => o[k]) {
  let positions = new Map ()
  let rows = []
  let width = 0
  let height = 0
  
  // layers are ordered from top to bottom
  // this is already given to us by the groupBy function

  // So first, fill each of the rows;
  // we cannot do actual layout yet, as we do not yet know the 
  // horizontal added space needed

	layers.forEach (function (row, row_key) { // row[i]:X
    var renderedRow = new Row ()
    renderedRow.y = height
    for (let item of row) {
      renderedRow.add ({ node:item, pic:picFor (item) })
    }
    rows.unshift (renderedRow)
    height += (renderedRow.height + renderedRow.depth)
    width = Math.max (width, renderedRow.width)
  })

  const C = new Canvas ({ left:0, right:width, top:-rows[rows.length-1].height, bottom:height  })
  //log (C.rect)

  // We now have the heights and withs of each of the rows
  // So .. continue, bottom up by computing the space between
  // and actually drawing the nodes

  for (let renderedRow of rows) {
    var items = renderedRow.items
    var space = (width - renderedRow.width) / items.length
    var w = 0, i=0

    // draw the bounding box/ and baseline
    // C.rect (0, renderedRow.y-renderedRow.height, renderedRow.width, renderedRow.height + renderedRow.depth)
    // C.rect (0, renderedRow.y, renderedRow.width, .1)
    
    // now moving bottom up
		for (let { node, pic } of items) { // id:X node:GX
      //log ('start actual layout, row', renderedRow, {id, node, pic})
      let x = (i+.5) * space + w + (pic.width)/2
      let pt = { x, y:renderedRow.y, pic }
      positions.set (node, pt)
      w += pic.width
      i++
      C.path ('node '+pic.class, pt, pic.shape)

      C.rect (pt.x - pic.width/2, pt.y-pic.height, pic.width, pic.height)
      C.rect (pt.x - pic.width/2, pt.y, pic.width, pic.depth)

      // if (pic.label != null) C.label ('label '+pic.class, pt, pic.label)
      // for (let a of pic.anchors) {
      //   const to = positions.get (getSub (node, a.for))
      //   if (to){
      //     if (to.pic.anchor) { to.x += pic.anchor.x; to.y += to.pic.anchor.y }
      //     C.arc (a.class, addPt (pt, a.from), a.dir,  to)
      //   }
      // }
    }
    
    // Third pass: draw the arcs
		for (let { node, pic } of items) {
      const pt = positions.get (node)
      //log ([pt.x, pt.y])
      if (pic.label != null)
        C.label ('label '+pic.class, pt, pic.label)
      for (let a of pic.anchors) {
        let to = positions.get (getSub (node, a.for))
        if (to){
          if (to.pic.anchor) to = { x: to.x + to.pic.anchor.x, y: to.y + to.pic.anchor.y }
          C.arc (a.class, addPt (pt, a.from), a.dir,  to, a.bend )
        }
      }
    }
    
  }
  return C
}


// Geometry
// --------

// Placed rect
const unitRect = { left:0, right:0, top:0, bottom:0 }

function distance (p1, p2) { // assuming all positive
	var w = p1.x > p2.x ? p1.x-p2.x : p2.x-p1.x
	var h = p1.y > p2.y ? p1.y-p2.y : p2.y-p1.y
	return Math.sqrt(w*w+h*h) }

function addPt ({x,y}, b = {x:0, y:0}) {
  return { x:x+b.x, y:y+b.y }
}

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


// Canvas/ svg generator
// ---------------------

function Canvas (rect_ = unitRect) {
	let nodes = []
    , arcs = []
    , labels = []
    , bounds = rect_

  this.bounds = bounds // bounding rectangle

  this.render = function render () {
    const { left, right, top, bottom } = bounds
  	const w = bounds.right - bounds.left
    const h = bounds.bottom - bounds.top
  	return `
    <svg width="${_round(w)}" height="${_round(h)}">
      <g transform="translate(${_round(-bounds.left+.5)} ${(-bounds.top+.5)})">
        ${arcs.join('')}
        <g class="nodes">${nodes.join('')}
        </g>${labels.join('')}
      </g>
    </svg>
    ` }

  this.rect = function rect (x, y, w, h) {
  	nodes.push (`<rect x="${x}" y="${y}" width="${w}" height="${h}" />`+'\n') }

  this.path = function path (name, p, d) {
  	nodes.push (`<path transform="translate(${_round(p.x)} ${_round(p.y)})" class="${name}" d="${d}" />`+'\n') }

  this.arc = function arc (name, p1, a, p2, _s = .5, _o = 3) {
  	var h1 = mova(p1, a, _o), h = mova(p1, a, distance(p1, p2)*_s)
  	bounds = grow (bounds, h)
  	var d = ['M', p1.x, p1.y, 'L', h1.x, h1.y, 'Q', h.x, h.y, p2.x, p2.y].map(_round).join(' ')
  	arcs.push (`<path ${name != null ? `class="${name}"` : ''} d="${d}" />` + '\n') }

  this.label = function label (name, p, text) { // FIXME escape text
  	labels.push ('<text class="'+name+'" x="'+p.x+'" y="'+(p.y-1.3)+'">'+text+'</text>\n') }
}

function _round (n) {
	return typeof n === 'number' ? Math.round(10*n)/10 : n }


module.exports = 
  { Canvas, layout2, groupByRank, groupByCorank }
