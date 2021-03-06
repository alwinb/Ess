const log = console.log.bind (console)
module.exports = { desugar }

// Assuming the ordering of primitives as (elsewhere)
// The primitve types can be desugared as follows,
// however, the concrete syntax will forbid such direct use
// (because it leaks implementation specifics)
// and so I distinguish LTE and ILTE, the second
// one being the 'internal one'.
//
//  [all numbers] < null < (others) < false < true < [all strings]
//
// number = ILT null
// string = IGT true
// boolean = IGTE false & ILTE true
// true = IGTE true & ILTE true
// false = IGTE false & ILTE false
// null = IGTE null & ILTE null
// 3 = IGTE 3 & ILTE 3
// >3 = IGT 3 && ILT null
// "foo" = IGTE "foo" & ILTE "foo"

function desugar (tuple, ...rest) {
  // log ('desugar', tuple, rest)
  let op = tuple[0], v
  switch (op) {

    case 'op': // 'top': case 'bot':
      return [tuple[1]]

    case 'diam': case 'box':
      return [op, tuple[1], tuple[2]]

    case 'group':
      return tuple[1]

    case 'number':
      var n = tuple[1]
      return ['and', ['IGTE', n], ['ILTE', n]]

    case 'string':
      return ['and', ['IGTE', tuple[1]], ['ILTE', tuple[1]]]

    case 'value':
      if (typeof (v = tuple[1]) === 'string')
        return ['and', ['IGTE', v], ['ILTE', v]]

      if (typeof (v = tuple[1]) === 'number')
        return ['and', ['IGTE', v], ['ILTE', v]]

      if (tuple[1] === true)
        return ['and', ['IGTE', true], ['ILTE', true]]

      if (tuple[1] === false)
        return ['and', ['IGTE', false], ['ILTE', false]]

      if (tuple[1] === null)
        return ['and', ['IGTE', null], ['ILTE', null]]

    // Types, and comparisons on numbers
    // These are 'desugared' to internal comparisons
    // An this, is highly specific to the otherwise irrelevant 
    // internal order on primitive types used; so be cautious. 
    // (Should be encapsulated)

    case 'type':
      switch (tuple[1]) {
        case 'boolean': return ['and', ['IGTE', false], ['ILTE', true]]
        case 'number': return ['ILT', null]
        case 'string': return ['IGT', true]
    }

    case 'lt':
      return ['and', ['ILT', tuple[1]], ['ILT', null]]

    case 'lte':
      return ['and', ['ILTE', tuple[1]], ['ILT', null]]

    case 'gt':
      return ['and', ['IGT', tuple[1]], ['ILT', null]]

    case 'gte':
      return ['and', ['IGTE', tuple[1]], ['ILT', null]]

    default:
      return tuple
  }
}
