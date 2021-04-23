const log = console.log.bind (console)
// const { inspect } = require ('util')
// const show = _ => console.log (inspect (_, { depth:10 }), '\n')
const hoop = require ('../lib/hoop2.js')
const { token, tokenType, start, atom, prefix, infix, assoc, end } = hoop
const { LEAF, PREFIX, INFIX, POSTFIX } = hoop.Roles
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
// Operators are grouped by precedence and
// ordered by streangth, increasing. 

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
    , range:  [LEAF, `<=?|>=?`, 'Range', `.{0}`] // 'wrapfix'-atom
    , group:  [LEAF, `[(]`,     'Term',   `[)]`] // wrapfix-atom
    , string: [LEAF, `["]`,     'Chars',  `["]`] }, // wrapfix-atom

    { iff:    infix `<->` }, // is assoc, but that's not implemented in ess
    { then:   infix `->`  }, // is infixr -- should mark that in hoop
    { or:     infix `[|]` }, // should be infixl -- not yet implemented in hoop
    { and:    infix `[&]` },

    { modal:  [PREFIX, `[a-zA-Z_][a-zA-Z_0-9]*`, 'Modal', `.{0}` ] }, // 'wrapfix'-prefix
    { not:    prefix `[!]` }
  ]
}

const Range = {
  name: 'Range',
  skip: skips,
  end: end `.{0}`,
  sig: [
    { number: atom `${_int} ${_frac}? ${_exp}?` }
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
    , empty:  atom `.{0}(?=")` },

    { conc:  infix `.{0}(?!")` }
  ]
}


// Compile the grammar
// -------------------

const compiled =
  hoop.compile ({ Term, Modal, Range, Chars })

// Collecting the names for the node types

const typeNames = {}
const _ts = compiled.types
for (const ruleName in _ts)
  for (const typeName in _ts[ruleName])
    typeNames[_ts[ruleName][typeName]] = typeName
    // typeNames[_ts[ruleName][typeName]] = ruleName +'.' + typeName


// Configuring the parser
// ----------------------

function parse (input, apply_) {
  const apply = apply_ == null ? preEval : (...args) => apply_ (preEval (...args))
  const S0 = compiled.lexers.Term.Before.next ('(')
  const E0 = compiled.lexers.Term.After.next (')')
  const p = new hoop.Parser (compiled.lexers, S0, E0, apply)
  return p.parse (input)
}


// The parser algebra
// ------------------

const _escapes =
  { 'b':'\b', 'f':'\f', 'n':'\n', 'r':'\r', 't':'\t' }

const T = compiled.types

function preEval (...args) {
  const [op, x1, x2] = args
  const [tag, data] = op
  args[0] = typeNames [tag]
  // log ('preEval', op, x1||'', x2||'')
  // log (tag, typeNames[tag])
  const r
    = tag === T.Term.group ? x1
    : tag === T.Term.type   ? [args[0], data]
    : tag === T.Term.range  ? [ {'<':'lt', '<=':'lte', '>':'gt', '>=':'gte'}[data], x1]
    : tag === T.Term.number ? ['value', +data]
    : tag === T.Range.number ? +data
    : tag === T.Term.string ? ['value', x1]
    : tag === T.Term.value  ? ['value', {null:null, true:true, false:false}[data]]
    : tag === T.Term.modal  ?  [x1[0], data, x2]

    : tag === T.Chars.empty ? ''
    : tag === T.Chars.chars ? data
    : tag === T.Chars.esc ? _escapes [data[1]] || data[1]
    : tag === T.Chars.hexesc ? String.fromCodePoint (parseInt (data.substr(2), 16))
    : tag === T.Chars.conc ? x1 + x2

    : args
  return r
}

module.exports = { parse }