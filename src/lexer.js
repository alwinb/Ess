const { Lexer } = require ('ab-parse')

// ## The lexer

const newline = '\\n'
  ,   space = '[ \\t\\f]+'
  ,    type = '(?:boolean|number|string)\\b' // removed integer (object, array) for the time being
  ,   konst = '(?:null|true|false)\\b'
  ,  symbol = '[a-zA-Z_][a-zA-Z_0-9]*'
  ,  escape = '\\\\(?:["bfnrt/\\\\]|[u][0-9A-Fa-f]{4})'
  ,     nsc = '[^\\\\"\\u0000-\\u001F]+'
  ,  dquote = '"'
  ,     exp = '(?:[Ee][+-]?[0-9]+)'
  ,    frac = '(?:\\.[0-9]+)'
  ,     int = '(?:-?(?:0|[1-9][0-9]*))'
  ,  number = int + frac + '?' + exp + '?'
  ,   modal = '\\?:|\\:'
  ,   tobot = 'any\\b|void\\b'
  ,     ops = '[()[\\]|&!]|<->|<-|->'
  ,     cmp = '<=|<|>=|>'

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
  , [ escape, 'escape-sequence', 'string_concat']
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
  [ [ number, 'number_ineq', 'main']
  , [ space,  'space',  'ineq']
  ]
}

const lexer = new Lexer (grammar, 'main')
module.exports = lexer