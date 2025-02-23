const util = require ('util')
const log = console.log.bind (console)

// Signatures
// ==========
// These are polynomial functors in DNF, e.g. disjoint unions of
// tuples of types over a single type variable. Here they are encoded
// as maps (objects) from the disjoint union tag to a tuple (array)
// of type names, where where I use `0` (inspired by marijnh; 
// pronounced 'hole') to stand for the type variable. 

// Ess Terms
// ---------
// The signature of Ess terms. This encodes exactly the signature
// as in the theory: a multimodal logic over some base types and
// numeric bounds. 

const Terms = {
  any:     [],
  bottom:  [],
  and:     [0, 0],
  or:      [0, 0],
  not:     [0   ],
  then:    [0, 0],
  iff:     [0, 0],
  diam:    ['name', 0],
  box:     ['name', 0],

  number:  [],
  boolean: [],
  string:  [],
  object:  [],
  array:   [],

  value:  ['primitive'],
  lt:     ['number'],
  lte:    ['number'],
  gte:    ['number'],
  gt:     ['number'],
}


// Raw terms
// ---------
// The signature of raw parse trees. These trees have more nesting
// than plain Ess terms; reflecting more of the structure as seen 
// by the lexer (and parser). 

const RawTerms = {
  any:     [],
  bottom:  [],
  and:     [0, 0],
  or:      [0, 0],
  not:     [0   ],
  then:    [0, 0],
  iff:     [0, 0],
  diam:    [0, 0],
  box:     [0, 0],
  group:   [0   ],

  type:    ['string'],
  number:  ['number'],
  symbol:  ['string'],
  value:   ['primitive'],
  bound:   ['number'],

  lt:      [0],
  lte:     [0],
  gte:     [0],
  gt:      [0],

  string:  [0],
  conc:    [0, 0],
  chars:   ['chars'],
  escaped: ['escaped'],
}


// Ess Decision Diagrams
// ---------------------

const Ternaries = {
  test:   [0, 'test', 0],
  enter:  [0, 'name', 0],
  leave:  [0],
  return: [0, 'result'],
}


// Functors
// --------
// The (morphism part) of a functor for a given (encoded) signature

const createFunctor = signature => fn => ([op, ...args]) => {
  const r = [op], items = signature[op]
  for (let i = 0, l = items.length; i<l; i++ )
    r.push (items[i] === 0 ? fn (args[i]) : args [i])
  return r
}


// Folds
// -----
// `refold` encodes the hylomorphism recursion pattern;
// it takes a functor F, a coalgebra X -> FX and an algebra FX -> X
// and finally a term X; unfolds X using the coalgebra, and refolds
// it using the algebra. 

const refold = F => (out, inn, x) => { // out: X -> FX; inn: FY -> Y; x: X
  const F_fix = F (fix)
  function fix (x) { return inn (F_fix (out (x))) }
  return fix (x)
}


// Some useful signature generic- algebras
// ---------------------------------------

const createRankFunction = signature => ([op, ...args]) => {
  let r = 0, items = signature[op]
  for (let i = 0, l = items.length; i<l; i++)
    r = items[i] === 0 ? Math.max (r, args[i]) : r
  return r + 1
}

// An 'Image' is an object with a width, height and depth
// (height is ascender, depth is descender from baseline),
// together with an anchor (incoming references) and a list
// of anchors for outgoing / child nodes;
// a text label, and an svg pathData 'shape'.

const createImageFunction = signature => node => {
  const CHAR_WIDTH = 8 // TODO
  
  let label = createFunctor (signature) ($ => undefined) (node)
  label = [label[0], ...label.slice (1) .map ($ => $ === undefined ? '' : util.inspect ($))] .join (' ')
  
  const width = label.length * CHAR_WIDTH
  const anchors = [], items = signature[node[0]]
  for (let i=0, l = items.length; i<l; i++) {
    if (items[i] === 0) anchors.push ({ for:i + 1, from:{x:0,y:6}, dir:.5, bend:0 })
  }

  return {
    width: width + 3 * CHAR_WIDTH,
    height: 30,
    depth: 15,
    label,
    shape: `M-${width/2} -18 h${width} v26 h${-width} z`,
    anchor: {x:0, y:-18},
    anchors,
    class: 'node',
  }
}


// Exports
// -------

module.exports = {
  RawTerms, Terms, Ternaries,
  createFunctor, createImageFunction, createRankFunction,
  refold,
}