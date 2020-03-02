"use strict"
const log = console.log.bind (console)
const { tokenize } = require  ('./lexer')
const { TokenClasses, parse:_parse } = require ('ab-parse')
const T = TokenClasses

module.exports = { parse, desugar }

// Assuming the ordering of primitives as (elsewhere)
// The primitve types can be desugared as follows,
// however, the concrete syntax will forbid such direct use
// (because it leaks implementation specifics)
// and so I distinguish LTE and ILTE, the second
// one being the 'internal one'.

// number = ILT null
// string = IGT true
// boolean = IGTE false & ILTE true
// true = IGTE true & ILTE true
// false = IGTE false & ILTE false
// null = IGTE null & ILTE null
// 3 = IGTE 3 & ILTE 3
// >3 = IGT 3 && ILT null
// "foo" = IGTE "foo" & ILTE "foo"

// Desugared Terms are trees of nodes TOP BOT AND OR NOT THEN WHEN IFF (ILT v) (IGT v) (ILTE v) (IGTE v)

function desugar (tuple) {
  var op = tuple[0]
  switch (op) {

    case 'op': // 'top': case 'bot':
      return [tuple[1]]

    case 'diam': case 'box':
      return [op, tuple[1][1], tuple[2]]

    case 'group':
      return tuple[1]

    case 'number_ineq':
      return parseFloat (tuple[1], 10)

    case 'number':
      var n = parseFloat (tuple[1], 10)
      return ['and', ['IGTE', n], ['ILTE', n]]

    case 'value':
      if (tuple[1] === 'true')
        return ['and', ['IGTE', true], ['ILTE', true]]

      if (tuple[1] === 'false')
        return ['and', ['IGTE', false], ['ILTE', false]]

      if (tuple[1] === 'null')
        return ['and', ['IGTE', null], ['ILTE', null]]

    case 'type':
      switch (tuple[1]) {
        case 'boolean': return ['and', ['IGTE', false], ['ILTE', true]]
        case 'number': return ['IGT', true]
        case 'string': return ['ILT', null]
    }

    case 'lt':
      return ['and', ['ILT', tuple[1]], ['IGT', true]]

    case 'lte':
      return ['and', ['ILTE', tuple[1]], ['IGT', true]]

   case 'gt':
      return ['and', ['IGT', tuple[1]], ['IGT', true]]

   case 'gte':
      return ['and', ['IGTE', tuple[1]], ['IGT', true]]

    case 'conc':
      return tuple[1] + tuple[2] // Evaluating string concatenation

    case 'chars':
      return tuple[1]

    case 'escape-sequence':
      return eval ('"'+tuple[1]+'"') // FIXME do this safely

    case 'string':
      return ['and', ['IGTE', tuple[1]], ['ILTE', tuple[1]]]

    default:
      return tuple
  }
}


const optable =
{   '!': [    'not', T.PREFIX, 1]
,   ':': [   'diam', T.INFIXR, 0]
,  '?:': [    'box', T.INFIXR, 0]
,   '&': [    'and', T.INFIXL, 2]
,   '|': [     'or', T.INFIXL, 3]
,  '->': [   'then', T.INFIXR, 4]
,  '<-': [   'when', T.INFIXL, 4] // Not used
, '<->': [    'iff', T.INFIX , 5]
,   '>': [     'gt', T.PREFIX, 0]
,  '>=': [    'gte', T.PREFIX, 0]
,   '<': [     'lt', T.PREFIX, 0]
,  '<=': [    'lte', T.PREFIX, 0]
, 'any': [    'top', T.LEAF     ]
,'void': [    'bot', T.LEAF     ]
,   '(': [  'group', T.BEGIN    ]
,   ')': [  'group', T.END      ]
,   '"': [ 'string', T.BEGIN    ]
,   '"': [ 'string', T.END      ]
,    '': [   'conc', T.INFIXR, 0] // string-concat
}

function tokenInfo ([type, value]) {
  return type === 'op' ? optable [value]
    : type === 'space' ? [type, T.SPACE]
    : type === 'string-start' ? ['string', T.BEGIN]
    : type === 'string-end'   ? ['string', T.END]
    : [type, T.LEAF]
}

function parse (sample, alg = desugar) {
  return _parse (sample, tokenize, tokenInfo, alg)
}

/*
var str = '"foo\\nbar\\nbaz"'
var str = 'foo:true & bar:false & (true|false) | "foo"'
var tree = parse (str)
log (str)
log(JSON.stringify(tree, null,2))
//*/