
// The Ess Schema Language
// =======================

const { parse } = require ('./parser')
const { Store, toSvg, run } = require ('./ess-core.js')
const log = console.log.bind (console)
const json = x => JSON.stringify (x, null, 2)

function EssExp (string) {
  const {id, dtree} = _compile (string)
  const isTop = x === 1
  const isBottom = x === 0
  const test = input => run (dtree, input)
  return { source:string, isTop, isBottom, test }
}

function _compile (string) {
  let store = new Store ()
  let tm = parse (string)
  x = store.eval (tm)
  return { id: x, dtree: store.build (x) }
}


// Exports
// -------

EssExp.internals = { parse, Store, toSvg }
module.exports = EssExp

//* Quick test

// log ('#! JavaScript Test Output')
// process.on('uncaughtException', (e) => {
//   console.error ('#! JavaScript Error ')
//   console.error ('/*', e, '*/')
// })

// var e = EssExp ('type:"click" -> clientX:number & clientY:number')
// log (e.test ({ type:'click', clientX:1, clientY:1 }))
// e.test ({})
// e.test ({ })
// e.test ({ type:'click'})

//*/