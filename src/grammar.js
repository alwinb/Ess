const { inspect } = require ('util')
const log = console.log.bind (console)
const show = _ => console.log (inspect (_, { depth:10 }), '\n')
const hoop = require ('../lib/hoop2.js')
const { token, tokenType, start, atom, prefix, infix, assoc, end } = hoop
const { LEAF, PREFIX } = hoop.Roles
const { raw } = String

// HOOP Grammar for Ess
// ====================

// ### Preliminaries

const skips = {
  space:   raw `[\t\f\x20]+`,
  newline: raw `[\n]` , 
  comment: raw  `//[^\n]*`, 
}

const _exp = raw `(?:[Ee][+-]?[0-9]+)`
  ,  _frac = raw `(?:\.[0-9]+)`
  ,   _int = raw `(?:-?(?:0|[1-9][0-9]*))`

// ### Hoop Signature

// TODO still add the numeric ranges
//  '>': [ 'gt', T.PREFIX, 0]
// '>=': ['gte', T.PREFIX, 0]
//  '<': [ 'lt', T.PREFIX, 0]
// '<=': ['lte', T.PREFIX, 0]

const Term = {
  name: 'Term',
  skip: skips,
  end: end `[)]`,
  sig: [

    { any:    atom `any\b`
    , bottom: atom `bottom\b`
    , type:   atom `boolean\b | number\b | string\b`
    , number: atom `${_int} ${_frac}? ${_exp}?`
    , value:  atom `null\b | true\b | false\b`
    , group:  [LEAF, `[(]`,  'Term',  `[)]`]    // wrapfix-atom
    , string: [LEAF, `["]`,  'Chars', `["]`] }, // wrapfix-atom

    { iff:    assoc `<->` },
    { then:   assoc `->`  },
    { or:     assoc `[|]` },
    { and:    assoc `[&]` },

    { modal:  [PREFIX, `[a-zA-Z_][a-zA-Z_0-9]*`, 'Modal', `.{0}` ] }, // 'wrapfix'-postfix
    { not:    prefix `[!]` }
  ]
}

const Modal = {
  name: 'Modal',
  skip: skips,
  end: end `.{0}`,
  sig: [
    { diam: atom `[:]`
    , box:  atom `[?]:` }
  ]
}

const Chars = {
  name: 'Chars',
  end: end `["]`,
  sig: [
    { chars:  atom `[^\x00-\x19\\"]+`
    , esc:    atom `[\\]["/\\bfnrt]`
    , hexesc: atom `[\\]u[a-fA-F0-9]{4}`
    , empty:  atom `.{0}` },

    { conc:  infix `.{0}` }
  ]
}


// Compile the grammar
// -------------------

const compiled =
  hoop.compile ({ Term, Modal, Chars })

// Collecting the names for the node types

const typeNames = {}
const _ts = compiled.types
for (const ruleName in _ts)
  for (const typeName in _ts[ruleName])
    typeNames[_ts[ruleName][typeName]] = typeName
    // typeNames[_ts[ruleName][typeName]] = ruleName +'.' + typeName


// Configuring the parser
// ----------------------

function parse (input, apply) {
  const S0 = compiled.lexers.Term.Before.next ('(')
  const E0 = compiled.lexers.Term.After.next (')')
  const p = new hoop.Parser (compiled.lexers, S0, E0, apply)
  return p.parse (input)
}


// Testing
// -------

var samples = [
  'number',
  'a:10',
  '1 | 2 | 3',
  '1 & 2 | !3 & 4',
  'number -> 1 | 2 & a:boolean',
]

for (let s of samples) {
  log (s)
  log (s.replace (/./g, '='))
  show (parse (s)[1])
}

