const log = console.log.bind (console)

// The Ess Schema Language
// =======================

const parse = require ('./parser').parse
const { Store, _typeid, toSvg } = require ('./ess-core.js')

function EssExp (string) {
  let store = new Store ()
  let tm = parse (string)
  const x = store.eval (tm)

  this.isTop = x === 1
  this.isBottom = x === 0
  this.test = function (input) {
    // TODO
  }

  store = tm = null
  return this
}

function compile (string) {
  let store = new Store ()
  let tm = parse (string)
  x = store.eval (tm)
  y = store.eval (tm)
  let [tx, ty] = store.build (x, y)
  //log (tx, ty)
}


// Runtime
//  - Work in progress

const stack = []
let ref = module
let typ = null

const _info = obj => {
  return 1
}

const enter = name => {
  if (name in ref) {
    stack.push (ref)
    ref = ref [name]
    typ = _typeid (ref)
    return true
  }
  return false
}


module.exports = 
  { parse, Store, toSvg }

//*
let e = compile ('type:"click" -> clientX:number & clientX:number')
log (e)
log (enter( 'exports') && enter ('parse') && enter ('name'), ref, typ)
//*/