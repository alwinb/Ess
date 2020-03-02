"use strict"

// The Ess Schema Language
// =======================

const { parse } = require ('./parser')
const { Store, toSvg, run } = require ('./ess-core.js')
const log = console.log.bind (console)
const json = x => JSON.stringify (x, null, 2)

function EssExp (string) {
  const {id, dtree} = compile (string)
  const isTop = id === 1
  const isBottom = id === 0
  const test = input => run (dtree, input)
  return { source:string, isTop, isBottom, test }
}

function compile (string, store = new Store ()) {
  let tm = parse (string)
  let x = store.eval (tm)
  return { id: x, dtree: store.build (x) }
}


// Exports
// -------

EssExp.internals = { parse, Store, toSvg }
EssExp.EssExp = EssExp
EssExp.ess = (...args) => new EssExp (String.raw(...args)).test
module.exports = EssExp


/*
// var e = EssExp ('type:"click" -> clientX:number & clientY:number')
// log (e.test ({ type:'click', clientX:1, clientY:1 }))
// e.test ({})
// e.test ({ })
// e.test ({ type:'click'})

var r
var e = EssExp ('1')
r = e.test (NaN)
log (r)

var e = EssExp ('null')
r = parse ('number')
r = e.test (NaN)
log (r)

var s = new Store 
compile ('null', s)
log (s.heap)
//*/