// The Ess Schema Language
// =======================

const { desugar } = require ('./desugar')
const { parse } = require ('./grammar')
const { Store, toSvg, run } = require ('./ess-core.js')

function EssExp (string) {
  const { id, dtree } = compile (string)
  const isTop = id === 1
  const isBottom = id === 0

  const test = input =>
    run (dtree, input)

  const assert = input => {
    if (!run (dtree, input))
      throw new Error ('ess.assert `'+string+'` failed')
  }

  return { source:string, isTop, isBottom, test, assert }
}

const ess = (...args) =>
  new EssExp (String.raw (...args))

ess.assert = (...args) =>
  new EssExp (String.raw (...args)).assert

function compile (string, store = new Store ()) {
  let tm = parse (string, desugar)
  let x = store.eval (tm)
  return { id: x, dtree: store.build (x) }
}


// Exports
// -------


module.exports = { EssExp, ess, core: { parse, desugar, Store, toSvg, compile } }