const log = console.log.bind (console)
const Map = require ('../lib/aatree')
const L = require ('../lib/layout')
const { Shared, fold, mem_fold } = require ('../lib/base')

const cmp_triv = () => 0
const cmp_js = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0



// The Ess Term Algebra for Desugared Terms
// ----------------------------------------

const   TOP = 'any'     // top
    ,   BOT = 'bottom'  // bot
    ,  BOOL = 'boolean'
    ,   NUM = 'number'
    ,   STR = 'string'
    ,   OBJ = 'object'
    ,   ARR = 'array'
    , VALUE = 'value'   // VALUE v
    ,   BOX = 'box'     // box m x
    ,  DIAM = 'diam'    // diam m x
    ,   NOT = 'not'     // not x
    ,   AND = 'and'     // and x x
    ,    OR = 'or'      // or x x
    ,  THEN = 'then'    // then x x
    ,   IFF = 'iff'     // iff x x 
    ,    LT = 'lt'      // lt v
    ,   LTE = 'lte'     // lte v
    ,   GTE = 'gte'     // gte v
    ,    GT = 'gt'      // gt v

    // internals
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


// Total order on F nodes
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
  : c1 === VALUE  ? internalCompare (x1, x2)
  : c1 === ILT    ? internalCompare (x1, x2)
  : c1 === ILTE   ? internalCompare (x1, x2)
  : c1 === IGT    ? internalCompare (x1, x2)
  : c1 === IGTE   ? internalCompare (x1, x2)
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
//  [all numbers] < null < (objects) < E < (arrays) < O < (others) < false < true < [all strings]
// 
// This total order is implemented by the internalCompare function below. 

const [numType, nullType, objectType, arrayType, otherType, falseType, trueType, stringType] = 
  [0, 1, 2, 3, 4, 5, 6, 7]

// Internally used sentinel values
// REVIEW is this really needed, or, is this actually nicer for all other comparisons too?

const firstArray = []
const firstOther = Symbol ()

function typeof_ (a) {
  const t = typeof a
  return t === 'string' ? stringType
    : t === 'number' ? Number.isNaN (a) ? otherType : numType
    : a === null ? nullType
    : a === false ? falseType
    : a === true ? trueType
    : Array.isArray (a) ? arrayType
    : typeof a === 'object' ? objectType
    : otherType
}

function internalCompare (a, b) {
  const ta = typeof_ (a), tb = typeof_ (b)
  // log ({a, b, ta}, ta === arrayType, a === b, a === firstArray)
  return ta < tb ? -1 : ta > tb ? 1
    : ta === numType || ta === stringType ? (a < b ? -1 : a > b ? 1 : 0)
    : ta === arrayType ? (a === b ? 0: (a === firstArray ? -1 : b === firstArray ? 1 : 0))
    : 0
}


// var a = [ true, false, {}, [], null, 'foo', { valueOf:() => 10}, 10, 22, 'a'].sort (internalCompare)
// log(a)

// ### Defining types as boolean combinations of delimiters on this order. 
// For example:
// number := < null
// string := > true
// null := > number && < undefined

// So first, represent delimiters as tuples [above, value], [below, value]
// nb. this is enough for representing the types, for example
// number := [below null] and string := [above true]

// To uniquely represent these delimiters, they need to be normalized. 
// which with the order above is simply done by rewriting
// below true => above false

const ABOVE = '≤' // 'above' // 
const BELOW = '<' // 'below' // 

function normalizeDelimiter ([tag, value]) {
  return tag === BELOW && value === true ? [ABOVE, false]
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
  const inn = node => heap.push (node) - 1
  const memo = { v: new Map (cmp_js) } // memoisation of out :: X -> GX 
  return { heap, element:mem_foldG (memo, out, inn, x) }
}

// This converts a term-id into a javascript structure;
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
    : op === IFF  ?  a === b
    : undefined }


// The Ess algebra
// ---------------

function Store () {
  const shared = new Shared (compareGNodesWith (compareNormalizedDelimiters))
  const _norm = normalizeDelimiter
  const { inn, out } = shared

  // Store management and inspection
  
  this._heap = shared._heap
  this._out = out
  this._trace = x => traceG (out, x) // TODO make public

  this.apply = apply
  this.eval = evalEss
  this.toObject = x => buildG (out, assertInStore (x))

  // TODO mark the roots?
  this.toSvg = (x) => toSvg (
    x != null ? this._trace (assertInStore (x)) .heap
    : this._heap
  )

  // Precompute the constants
  // These are exposed in the API, and used by apply

  const bot  = inn ([RETURN,  false])
  const top  = inn ([RETURN,  true])
  const num  = inn ([TEST,  bot, _norm ([BELOW, null]), top])
  const bool = inn ([TEST,  inn ([TEST,  bot, _norm ([ABOVE, true]), top]), _norm ([BELOW, false]), bot])

  const obj = evalEss (['and', ['IGTE', null], ['ILT', firstArray]])
  const arr = evalEss (['and', ['IGTE', firstArray], ['ILT', firstOther]])
  const str  = inn ([TEST,  top, _norm ([ABOVE, true]), bot])


  // Algebraic constants

  this.top = top
  this.bot = this.bottom = bot
  this.number = num
  this.string = str
  this.bool = this.boolean = bool
  this.object = obj
  this.array = arr

  // Algebraic operations

  this.value = v => { let t
    if (v === null || (t = typeof v) === 'number' || t === 'boolean')
      return evalEss (['and', ['IGTE', v], ['ILTE', v]])
    else if (typeof t === 'string')
      return evalEss (['and', ['and', ['IGTE', v], ['ILTE', v]], ['DIAM', 'lenght', this.value(v.length)]])
    else
      throw new Error ('Ess.Store.value, value must be null, a boolean, a string, or a number')
    // TODO and not NaN
  }

  this.lt   = n => apply ([LT,  n]) // TODO must enforce n to be a non-NaN number
  this.lte  = n => apply ([LTE, n])
  this.gte  = n => apply ([GTE, n])
  this.gt   = n => apply ([GT,  n])

  this.not = not
  this.and  = (...args) => apply ([AND,  ...args])
  this.or   = (...args) => apply ([OR,   ...args])
  this.then = (...args) => apply ([THEN, ...args])
  this.iff  = (...args) => apply ([IFF,  ...args])
  this.diam = (...args) => apply ([DIAM,  ...args])
  this.box  = (...args) => apply ([BOX,  ...args])

  // Implementation

  function assertInStore (x) {
    if (x >= shared._heap.length)
      throw new Error (`Ess.Store: node #${String(x)} not in Store`)
    return x
  }

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

  function evalEss (tm) {
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

  // Internally, apply uses sorts, 
  // here implemented in _apply: FDX -> X 
  // _apply assumes references to:
  // inn: GX -> X
  // out: X -> GX 
  // top: x
  // bot: x

  function _apply ([op, a, b]) { 
    // log ('apply', ...arguments)
    switch (op) {
    case   TOP: return top
    case   BOT: return bot
    case   BOX: return inn ([ENTER, top, a, raise (b[1])]) // strip the sort
    case  DIAM: return inn ([ENTER, bot, a, raise (b[1])]) // strip the sort
    case   NOT: return not (a[1]) // strip the sort

    case   NUM: return num
    case   STR: return str
    case   OBJ: return obj
    case   ARR: return arr
    case  BOOL: return bool
    case VALUE: {
      if (typeof a === 'string') {
        const x = evalEss ([AND, [AND, [IGTE, a], [ILTE, a]], [DIAM, 'length', [VALUE, a.length]]])
        return x
      }
      return evalEss ([AND, [IGTE, a], [ILTE, a]]) // NB assumes a is primitive
    }
    case    LT: return evalEss ([AND, [ILT,  a], [ILT, null]])
    case   LTE: return evalEss ([AND, [ILTE, a], [ILT, null]])
    case   GTE: return evalEss ([AND, [IGTE, a], [ILT, null]])
    case    GT: return evalEss ([AND, [IGT,  a], [ILT, null]])

    // private/ internal comparisons
    case   ILT: return inn ([TEST,  bot, _norm ([BELOW, a]), top])
    case  ILTE: return inn ([TEST,  bot, _norm ([ABOVE, a]), top])
    case   IGT: return inn ([TEST,  top, _norm ([ABOVE, a]), bot])
    case  IGTE: return inn ([TEST,  top, _norm ([BELOW, a]), bot])

    case AND: /* short circuit optimization */
      var x = a[1], y = b[1] // strip the sorts
      // log ('AND', x, y)
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
      // log ('DEFAULT', a, b)
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

function EssDD (_dtree) {
  this._dtree = _dtree
  this.run = function (value) {
    return run (this._dtree)
  }
}

// Recall; internally;
//  [all strings] < null < false < true < [all numbers]
// NB no! not anymore! I've added numbers array and object

const [value, pop, left, label, right] = [1, 1, 1, 2, 3]

// run -- runs a prebuilt _tree_, e.g. nested tuples/ arrays in js
//  -- which is secretly a DAG, on a js value as input

function run (dtree, input) {
  const stack = []
  let ref = input, op, d,t // 

  while ((op = dtree [0]) !== RETURN) {
    if (op === LEAVE) {
      dtree = dtree [pop]
      ref = stack [--stack.lebgth]
    }

    else if (op === TEST) {
      [d,t] = dtree [label] // [c, value], c being one of ≤ <
      if (d === BELOW) // (ref < t)
        dtree = internalCompare (ref, t) < 0 ? dtree [right] : dtree [left]
      else // d === ABOVE  // (ref ≤ t)
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
    : g === TEST || g === ENTER ? Math.max (x, z) + 1
    : 0 }

// To see what we are doing, it is useful to be able to draw G-nodes. 
// Draws a G-node `n` containing points {x, y} at point `pt`. 

function testLabelFor ([d,v]) { // TODO careful, my svg renderer is sloppy and does no sting escapes
  const ds = (d === BELOW ? '< ' : '≤ ')
  const vs = 
    ( v === firstOther ? 'others'
    : v === firstArray ? 'arrays'
    : v == null ? 'null'
    : JSON.stringify (v))
  return ds + vs
}

function picFor (n) {
  const c = n[0]
  if (c === TEST) return {
    width:120,
    height:30,
    depth:15,
    class:c,
    anchor: {x:0, y:-18},
    shape:'M 36 -6 m 0 -12.8 a1 1 0 1 1 0 25.6 l-72 0 a1 1 0 1 1 0 -25.6 z',
    label: testLabelFor (n[2]),
    anchors: [
      { for:1, class:'false', dir:-4/12, from: {x:-48, y:0 }, bend:1 },
      { for:3, class:'true',  dir: 4/12, from: {x: 48, y:0 }, bend:1 }
    ],
  }
  if (c === ENTER) return {
    width:120, // NB the origin is at 60
    height:25,
    depth:20,
    anchor: {x:0, y:-18},
    class:c,
    shape:'M0 -5 m-54 0 l 12 12 h84 l12 -12 l-12 -12 h-84zm114 0 l-18 18',
    label: n[2],
    anchors: [
      { for:1, class:'false', from:{x:-48, y:0}, dir:-3/8 },
      { for:3, class:'true',  from:{x: 48, y:0}, dir: 3/8 }
    ],
  }
  if (c === LEAVE) return {
    width:55,
    height:8,
    depth:10,
    anchor: {x:0, y:-4},
    class:c,
    shape:'m-18 -4h36',
    anchors: [
      { for:1, class:'pop', dir:1/2 },
      /// ('leave', pt, 1/2, n[1], .2, 0) } // from, angle, to, curvature, curvature offset
    ],
  }
  if (c === RETURN) return {
    width:75,
    height:25,
    depth:22,
    class:c,
    anchor: {x:0, y:-15},
    shape:'M-12.5 -15 h24 v19 h-24z',
    label:n[1] ? '&#x22A4;' : '&#x22A5;',
    anchors:[]
  }
}

function picFor_ (heap) { return i => picFor (heap[i]) }

function toSvg (heap) {
  var layers = L.groupByRank (G, (a,b) => cmp_js (b,a), rank, heap)
  return L.layout2 (layers, picFor_(heap), (x,k) => heap[x][k]).render ()
}


module.exports = { Store, toSvg, run, internalCompare }