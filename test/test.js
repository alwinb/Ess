"use strict"

// Test Ess

const { core } = require ('../src/')
const log = console.log.bind (console)
const samples = require ('./samples')

// Use tagscript for html generation

const { tag, end, Renderer, render, raw, Page } = require ('tagscript')


// Samples

//const _types = ['string', 'null', 'false', 'true', 'number']


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

const store = new core.Store ()
function exec (str) {
  if (str === null || str === undefined) 
    return [tag('hr', {style:'clear:both'})]

  let tm = core.parse (str)
  let x = store.eval (tm)
  let svg = core.toSvg (store.trace (x).heap)
  return box (wrap('code', str), tag('br'), raw(svg))
}

const p = new Page ('Test Ess')
  .withStyle ('file://'+__dirname+'/../resources/style.css?'+Math.random())
  .withBody (samples.map (exec))

log (render (p))


//process.exit (205)