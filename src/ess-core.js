const log = console.log.bind (console)
  , Map = require ('../lib/aatree')
  , L = require ('../lib/layout')
  , { Shared, fold, mem_fold } = require ('../lib/base')

const cmp_triv = () => 0
const cmp_js = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0



// The Ess Term Algebra for Desugared Terms
// ----------------------------------------

const  AND = 'and'  // and x x
    ,   OR = 'or'   // or x x
    , THEN = 'then' // then x x
    , WHEN = 'when' // when x x
    ,  IFF = 'iff'  // iff x x 
    ,  NOT = 'not'  // not x
    ,  TOP = 'top'  // top
    ,  BOT = 'bot'  // bot
    ,  BOX = 'box'  // box m x
    , DIAM = 'diam' // diam m x
    , RAISE = 'raise' // raise x // nonstandard, a hack. 
    , ILT  = 'ILT'  // ILT v
    , ILTE = 'ILTE' // ILTE v
    , IGT  = 'IGT'  // IGT v
    , IGTE = 'IGTE' // IGTE v


const _twoary = { and:1, or:1, then:1, when:1, iff:1 }

// The morphism part of the signature functor `F`. 

const F = fn => fx => {
  const [op, x1, x2] = fx
  return op === NOT ? [op, fn(x1)]
  : op === RAISE ? [op, fn(x1)]
  : op === BOX || op === DIAM ? [op, x1, fn(x2)]
  : op in _twoary ? [op, fn(x1), fn(x2)]
  : fx /* case for top, bot, ILTE etc */ }


// Given a total order on `X`, return a total order on `FX`. 

const compareFNodesWith = cmp_x => (t1, t2) => {
  // NB this uses cmp_js on values and modalities
  const cmp_int = internalCompare
  const [c1, x1, y1] = t1
  const [c2, x2, y2] = t2
  return c1 < c2  ? -1
  : c1 > c2       ? 1
  : c1 === NOT    ? cmp_x  (x1, x2)
  : c1 === RAISE  ? cmp_x  (x1, x2)
  : c1 === BOX    ? cmp_js (x1, x2) || cmp_x (y1, y2)
  : c1 === DIAM   ? cmp_js (x1, x2) || cmp_x (y1, y2)
  : c1 in _twoary ? cmp_x  (x1, x2) || cmp_x (y1, y2)
  : c1 === ILT    ? cmp_js (x1, x2)
  : c1 === ILTE   ? cmp_js (x1, x2)
  : c1 === IGT    ? cmp_js (x1, x2)
  : c1 === IGTE   ? cmp_js (x1, x2)
  : undefined }


// The 'Decoration' functor D
// ---------------------------
// The functor `D` is the 'decorator` functor
// DX := S*X for some set of 'colours' S. A D-node is just a tuple [s, x]
// The function `D` implements the morphism part of the decoration functor. 

const D = fn => ([s, x]) => [s, fn(x)]

// This compares on the sort first, do we want that?
function cmpD (cmp_s, cmp_x) { 
  return ([s1, x1], [s2, x2]) => (cmp_s (s1, s2) || cmp_x (x1, x2)) }



// Using continuous ranges to represent Ess primitive types
// --------------------------------------------------------
// By imposing an order on primitive javascript values as follows:
// 
//  [all strings] < null < false < true < [all numbers]
// 
// This total order is implemented by the internalCompare function below,
//  which assumes its arguments to be of type number, boolean, string, or value null. 

const _types = ['string', 'null', 'false', 'true', 'number']

function internalType (a) {
  const t = typeof a
  return t === 'number' ? 4
    : t === 'string' ? 0
    : a === false ? 2
    : a === true ? 3
    : a == null ? 1
    : 1 //// or error. 
}

const internalCompare = (a, b) => {
  const ta = internalType (a), tb = internalType (b)
  return ta < tb ? -1 : ta > tb ? 1
    : (ta === 0 || ta === 4 ? (a < b ? -1 : a > b ? 1 : 0) : 0)
}

// ### Defining types as boolean combinations of delimiters on this order. 
// For example:
// number := < null
// string := > true
// null := > number && < false

// So first, represent delimiters as tuples [above, value], [below, value]
// nb. this is enough for representing the types, for example
// number := [below null] and string := [above true]

// To uniquely represent these delimiters, they need to be normalized. 
// normalizing them as follows: 
// above null => below false
// below true => above false

const ABOVE = '≤'
const BELOW = '<'

function normalizeDelimiter ([tag, value]) {
  return tag === ABOVE && value == null ? [BELOW, false]
    : tag === BELOW && value === true ? [ABOVE, false]
    : [tag, value]
}

// Delimiters themselves can be put into a total order
// this is useful later to decide on a unique representation of types. 

function compareDelimiterTags (tag1, tag2) {
  return tag1 === tag2 ? 0 : tag1 === ABOVE ? 1 : -1
}

function compareNormalizedDelimiters ([tag1, value1], [tag2, value2]) {
  return internalCompare (value1, value2) || compareDelimiterTags (tag1, tag2)
}



// Ess Decision Diagrams
// ---------------------

const TEST = 'test'     // test x p x
    , ENTER = 'enter'   // enter x m x
    , LEAVE  = 'leave'  // leave x
    , RETURN = 'return' // return r


// The function `G` implements the morphism part
//  of the signature functor `G`

const G = fn => gx => {
  const [op, x1, x2, x3] = gx
  return op === TEST ? [op, fn(x1), x2, fn(x3)]
    : op === ENTER   ? [op, fn(x1), x2, fn(x3)]
    : op === LEAVE   ? [op, fn(x1)]
    : gx /* case for return */ }


const mem_foldG = mem_fold (G)

// This traces out the subterm rooted at x
function traceG (out, x) { 
  const heap = []
  const inn = fx => heap.push(fx) - 1
  const memo = { v: new Map (cmp_js) } // memoisation of out :: X -> GX 
  return { heap, element:mem_foldG (memo, out, inn, x) }
}

// This converts a term-id into a tree;
// however, internally it preserves the subterm sharing. 

function buildG (out, x) { 
  const inn = fx => fx
  const memo = { v: new Map (cmp_js) } // memoisation of out :: X -> GX 
  return mem_foldG (memo, out, inn, x)
}



// A total order on G nodes
//  parameterized by the orders on p (tests), m (modalities) and r (return values)

const orderOnGNodeTypes = { test:1, enter:2, leave:3, return:4 }

function compareGNodesWith (cmp_P, cmp_M = cmp_js, cmp_R = cmp_js) {
  return function compareGNodes (cmp_x) {
    return function compare (t1, t2) {
      //log ('compare', ...arguments)
      const [c1, x1, y1, z1] = t1
      const [c2, x2, y2, z2] = t2
      var r = cmp_js (orderOnGNodeTypes [c1], orderOnGNodeTypes [c2])
      if (r) return r
      return c1 === TEST ? (cmp_P  (y1, y2) || cmp_x (x1, x2) || cmp_x (z1, z2))
      : c1 === ENTER     ? (cmp_M  (y1, y2) || cmp_x (x1, x2) || cmp_x (z1, z2))
      : c1 === LEAVE     ?  cmp_x (x1, x2)
      : c1 === RETURN    ?  cmp_R (x1, x2)
      : undefined
      return r } } }


// The binary operators can be implemented on ordered Ess diagrams,
// via a coalgebraic zip operation that preserves the ordering of the nodes. 
// At each step, the 'zip operation either takes left first, right first
// or both at once ('squash', or 'both'). 

const decide = compareGNodesWith (compareNormalizedDelimiters, cmp_js, cmp_triv) (cmp_triv)

function both (op, gx1, gx2) {
  const [ c, x1, a, y1] = gx1
  const [__, x2, _, y2] = gx2
  const r = c === RETURN ? [RETURN, evalBool (op, x1, x2)]
    : c === LEAVE ? [LEAVE, [op, x1, x2]]
    : [c, [op, x1, x2], a, [op, y1, y2]]
  return r
}

function evalBool (op, a, b) {
  return op === AND ? a && b
    : op === OR   ?  a || b
    : op === THEN ? !a || b
    : op === WHEN ?  a || !b
    : op === IFF  ?  a === b
    : undefined }


// The algebra
// -----------

function Store () {
  const shared = new Shared (compareGNodesWith (compareNormalizedDelimiters))
  const { inn, out } = shared
  const bot = inn ([RETURN,  false])
  const top = inn ([RETURN,  true])

  this.out = out
  this.heap = shared._reify ()

  this.trace = x => traceG (out, x)
  this.build = (x) => buildG (out, x)
  this.eval = eval
  this.apply = apply

  this.top = top
  this.bot = bot
  this.bottom = bot
  this.not = not
  this.and  = (...args) => apply ([AND,  ...args])
  this.or   = (...args) => apply ([OR,   ...args])
  this.then = (...args) => apply ([THEN, ...args])
  this.when = (...args) => apply ([WHEN, ...args])
  this.iff  = (...args) => apply ([IFF,  ...args])
  this._lt  = (...args) => apply ([ILT,  ...args])
  this._lte = (...args) => apply ([ILTE, ...args])
  this._gte = (...args) => apply ([IGTE, ...args])
  this._gt  = (...args) => apply ([IGT,  ...args])


  // apply: FX -> X
  // is a function that applies a 'first order operation',
  // e.g. an operator from the Ess algebra together with
  // operands being Ess-bdds,
  // and returns a reference to a new Ess-bdd. 

  function apply (fx) {
    const fdx = F (x => [0, x]) (fx)
    return _apply (fdx)
  }

  // eval: uF -> X
  // is a function that takes a tree of F nodes,
  // e.g. the AST of an ess expression
  // and evaluates it to (a reference to) an Ess-bdd. 

  function eval (tm) {
    return fold (F) (x => x, apply, tm)
  }

  // `out_s` is a sorted version of `out`; 
  // for `nx = [n,x]` _assuming_ `x` is of sort `n`.  
  // This is implemented as a distributive law. DGX -> GDX. 

  function out_s ([n, x]) { // DX -> GDX
    //console.log ('out_s', n, x)
    const node = out (x)
    const [c, x1, a, x2] = node
    // The part below implements the distributive law DGX -> GDX. 
    return c === TEST ? [  TEST, [   n, x1 ], a, [   n, x2 ] ]
      : c === ENTER   ? [ ENTER, [   n, x1 ], a, [ n+1, x2 ] ]
      : c === LEAVE   ? [ LEAVE, [ n-1, x1 ] ]
      : node }

  const _norm = normalizeDelimiter

  // Internally, apply uses sorts, 
  // here implemented in _apply: FDX -> X 
  // _apply assumes references to:
  // inn: GX -> X
  // out: X -> GX 
  // top: x
  // bot: x

  function _apply ([op, a, b]) { 
    //log ('apply', ...arguments)
    switch (op) {
    case   TOP: return top
    case   BOT: return bot
    case   BOX: return inn ([ENTER, top, a, raise (b[1])]) // strip the sort
    case  DIAM: return inn ([ENTER, bot, a, raise (b[1])]) // strip the sort
    case   NOT: return not (a[1]) // strip the sort

    case   ILT: return inn ([TEST,  bot, _norm ([BELOW, a]), top])
    case  ILTE: return inn ([TEST,  bot, _norm ([ABOVE, a]), top])
    case   IGT: return inn ([TEST,  top, _norm ([ABOVE, a]), bot])
    case  IGTE: return inn ([TEST,  top, _norm ([BELOW, a]), bot])

    case AND: /* short circuit optimization */
      var x = a[1], y = b[1] // strip the sorts
      if (x === y) return x
      else if (x === bot || y === bot) return bot
      else if (x === top) return y
      else if (y === top) return x
      /* fallthrough */

    case OR: /* short circuit optimization */
      var x = a[1], y = b[1] // strip the sorts
      if (x === y) return x
      else if (x === top || y === top) return top
      else if (x === bot) return y
      else if (y === bot) return x
      /* fallthrough */

    default:
      const [gdx, gdy] = [out_s (a), out_s (b)]
      const decision = cmp_js (b[0], a[0]) || decide (gdx, gdy) // note the reverse compare on sorts

      const [c, x1, x2, x3] = gdx
      const [d, y1, y2, y3] = gdy

      if (decision < 0) { // left comes first
        if (c === TEST && d === TEST) // optimize tests
          return reduce ([TEST, _apply ([op, x1, b]), x2, _apply ([op, x3, y3])])
        return reduce (G (x_ => _apply ([op, x_, b])) (gdx))
      }

      if (decision > 0) {// right comes first
        if (c === TEST && d === TEST) // optimize tests
          return reduce ([TEST, _apply ([op, a, y1]), y2, _apply ([op, x3, y3])])
        return reduce (G (y_ => _apply ([op, a, y_])) (gdy))
      }

      else
        return reduce (G (_apply) (both (op, gdx, gdy)))
    }
  }

  function not (x) {
    const gx = out (x), [c, r] = gx
    return shared.inn (c === RETURN ? [RETURN, !r] : G (not) (gx))
  }

  function raise (x) {
    const gx = out (x), [c] = gx
    return shared.inn (c === RETURN ? [LEAVE, x] : G (raise) (gx))
  }

  function reduce (gx) { // GX -> X
    const [c, x1, a, x2] = gx
    if (c === TEST) {
      if (x1 === x2) return x1
      const [d, x11, _, x12] = out (x1)
      if (d === TEST && x12 === x2) return x1
    }
    else if (c === ENTER) {
      const right = out (x2)
      return (right[0] === LEAVE && right[1] === gx[1]) ? gx[1] : inn (gx)
    }
    return inn (gx)
  }

}


// The runtime!
// ------------

const [value, pop, left, label, right] = [1, 1, 1, 2, 3]

// Recall; internally;
//  [all strings] < null < false < true < [all numbers]

// run -- runs a prebuilt _tree_, e.g. nested tuples/ arrays in js
//  -- which is secretly a DAG, on a js value as input

function run (dtree, input) {
  const stack = []
  let ref = input, op, d,t // 

  while ((op = dtree [0]) !== RETURN) { // Nice idea to return a trace, for debugging
    if (op === LEAVE) {
      dtree = dtree [pop]
      ref = stack.pop()
    }

    else if (op === TEST) {
      [d,t] = dtree [label] // [c, value], c being one of ≤ <
      if (d === '<') // (ref < t)
        dtree = internalCompare (ref, t) < 0 ? dtree [right] : dtree [left]
      else // (ref ≤ t)
        dtree = internalCompare (ref, t) <= 0 ? dtree [right] : dtree [left]
    }

    else if (op === ENTER) {
      t = dtree [label]
      if (ref != null && typeof ref === 'object' && (t in ref)) {
        dtree = dtree [right]
        stack[stack.length] = ref
        ref = ref[t]
      }
      else {
        dtree = dtree [left]
      }
    }
  }
  return dtree [value]
}



// Layout
// ------

// `rank` is an unsorted G-algebra,  
// it is just the algebraic tree-height. 

function rank (gx) {
  const [g, x, y, z] = gx 
  return g === LEAVE ? x + 1
    : g === RETURN ? 0
    : g === TEST || g === ENTER || g === TYPE || g === VALUE ? Math.max (x, z) + 1
    : 0 }

// To see what we are doing, it is useful to be able to draw G-nodes. 
// Draws a G-node `n` containing points {x, y} at point `pt`. 

// I want the dimensions to be added in here, and have it work.. like a recipie
// also without having the subnode positions available. 
// Something like... { width, height, shape,  }
// Yes.. but I also want to specify HOW to draw the children..
// which may be... shape, child, label, ...
// Yes it should be a draw function simply, returning some pic-data together
// with an origin, width, height, fo be placed by the positioning?
// but then.. the arcs, remain problematic
// hmmm 

function drawG (canvas, pt, n) {
  var C = canvas
  var c = n[0]

  if (c === TEST) {
    C.circle ('node', pt, 12.8)
    C.arc ('false', pt, -3/8, n[1])
    C.label ('', n[2] , pt)
    C.arc ('true' , pt,  3/8, n[3]) }

  else if (c === ENTER) {
    C.use ('enter', pt)
    C.arc ('false', pt, -3/8, n[1])
    C.label ('', n[2] , pt)
    C.arc ('true' , pt,  3/8, n[3]) }

  else if (c === LEAVE) {
    C.hline ('node', pt, 36)
    C.arc ('leave', pt, 1/2, n[1], .2, 0) } // from, angle, to, curvature, curvature offset

  else if (c === RETURN) {
    C.rect ('node', pt, 24, 19.2)
    C.label ('return', n[1] ? '&#x22A4;' : '&#x22A5;', pt) }

  else if (c === FAIL) {
    C.rect ('node', pt, 24, 19.2)
    C.label ('fail', 'X', pt) }

}


var dims = 
{   'test': { width:55, height:45 }
,   'type': { width:80, height:45 }
,  'value': { width:80, height:45 }
,  'enter': { width:55, height:45 }
,  'leave': { width:55, height:3  }
, 'return': { width:55, height:23 }
,   'fail': { width:55, height:23 }
}


function toSvg (heap) {
  var grouped  = L.group_by (G, (a,b) => cmp_js (b, a), rank, heap)
  var metrics = L.layout2 (function(gx){ return dims[gx[0]] }, grouped, heap)
    , ps = metrics.positions
    , C = new L.Canvas (metrics)
  function getPosition (x) { return ps[x] }
  for (var i=0,l=heap.length; i<l;i++)
    drawG (C, ps[i], G (getPosition) (heap[i]))

  return C.render ()
}


module.exports = { Store, drawG, toSvg, run, internalType, internalCompare }