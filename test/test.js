// Test Ess

const ess = require ('../src/')
const ess_r = require ('../src/ess-core')
const store = new ess_r.Store ()
const log = console.log.bind (console)

// Use tagscript for html generation

const { tag, end, Renderer, render, raw, Page } = require ('tagscript')


// Samples

//const _types = ['string', 'null', 'false', 'true', 'number']

const samples =
  [ null

  , '3 & <4' 
  , 'name:"joe" & flag?:boolean'
  , 'a:1 | b:1'
  , 'a:>1 | b:<1'
  , 'type:"click" -> clientX:number & clientY:number'
  , null

  , '<1 & <2'
  , '<2 & <1'
  , '<1 | <2'
  , '<2 | <1'
  , '<1 & <2 & <3'
  , '<1 | <2 | <3'
  , '<1'
  , '<3'
  , '<=3'
  , '>3'
  , '>=3'
  , '3'
  , '>10 & <20'
  , '<1 & >2'
  , '<3 | >=3'
  , null

  , 'number'
  , '!string'
  , '!number'
  , 'number | !number'
  , 'number & string'
  , 'number & !string'
  , 'number & !string <-> number'
  , '!number & !string'
  , 'number | string'
  , 'number | !string'
  , 'number | !string <-> !string'
  , '!number | !string'
  , 'boolean & number'
  , 'boolean'
  , 'boolean | number'
  , 'number & boolean'
  , 'string | (number & boolean)'
  , 'boolean'
  , '!boolean'
  , 'false'
  , 'true'
  , 'true | false'
  , 'true | boolean'
  , 'boolean & !(true | false)'
  , '!true | !false'
  , null

  , '"joe"'
  , '"joe" & "fred"'
  , '"joe" | "fred"'
  , '!"joe" & !"fred"'
  , '!"joe" | !"fred"'
  , null

  , '"joe" & string'
  , '"joe" & !string'
  , '"joe" | string'
  , '!"joe" & string'
  , '!"joe" & !string'
  , null

  ]

///

function box (...tags) {
  return [tag('div', {class:'box'}), tags, end ('div')]
}

function wrap (name, ...tags) {
  return [tag (name), tags, end (name)]
}

// Idea, I'd like this to be autocurried
function* map (fn, it) { 
  for (x of it)
    yield fn (it)
}

function exec (str) {
  if (str === null || str === undefined) 
    return [tag('hr', {style:'clear:both'})]

  let tm = ess.parse (str, ess.desugar)
  let x = store.eval (tm)
  let svg = ess.toSvg (store.trace (x).heap)
  return box (wrap('code', str), tag('br'), raw(svg))
}

const p = new Page ('Test Ess')
  .withStyle ('file://'+__dirname+'/../resources/style.css?'+Math.random())
  .withBody (samples.map (exec))

log (render (p))
process.exit (205)