const { Lexer } = require ('ab-parse')
const log = console.log.bind (console)
const raw = String.raw

// ## The lexer
const
 newline = raw `\n`
,  space = raw `[ \t\f]+`
,   type = raw `(?:boolean|number|string)\b` // removed integer (object, array) for the time being
,  konst = raw `(?:null|true|false)\b`
, symbol = raw `[a-zA-Z_][a-zA-Z_0-9]*`
, escape = raw `\\(?:["bfnrt/\\]|[u][0-9A-Fa-f]{4})`
,    nsc = raw `[^\\"\u0000-\u001F]+`
, dquote = raw `"`
,    exp = raw `(?:[Ee][+-]?[0-9]+)`
,   frac = raw `(?:\.[0-9]+)`
,    int = raw `(?:-?(?:0|[1-9][0-9]*))`
, number = raw  `${int}${frac}?${exp}?`
,  modal = raw `\?:|\:`
,  tobot = raw `any\b|bottom\b`
,    ops = raw `[()[\]|&!]|<->|->`
,    cmp = raw `<=|<|>=|>`


const grammar = 
{ main: 
  [ [ type,    'type',   'modal_or_main']
  , [ konst,   'value',  'modal_or_main']
  , [ tobot,   'op',     'modal_or_main']
  , [ symbol,  'symbol', 'modal']
  , [ space,   'space',  'main']
  , [ newline, 'space',  'main']
  , [ ops,     'op',     'main']
  , [ cmp,     'op',     'ineq']
  , [ number,  'number', 'main']
  , [ dquote,  'string-start', 'string_chunck']
  ]

, string_chunck:
  [ [ nsc,    'chars', 'string_concat']
  , [ escape, 'escaped', 'string_concat']
  , [ dquote, 'string-end', 'main']
  ]

, string_concat:
  [ [ dquote, 'string-end', 'main']
  , [ '', 'op', 'string_chunck'] // The empty string is parsed as a string concatenaton operator
  ]

, modal:
  [ [ modal,   'op',    'main']
  , [ space,   'space', 'modal']
  , [ newline, 'space', 'modal']
  ]

, modal_or_main:
  [ [ modal,   'op',    'main']
  , [ space,   'space', 'modal_or_main']
  , [ newline, 'space', 'modal_or_main']
  , [ '',      'space', 'main']
  ]

, ineq:
  [ [ number, 'bound', 'main']
  , [ space,  'space',  'ineq']
  ]
}

const lexer = new Lexer (grammar, 'main')
module.exports = lexer