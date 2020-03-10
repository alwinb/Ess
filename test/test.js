const { core } = require ('../src/')
const log = console.log.bind (console)

// Use tagscript for html generation

const { tag, end, Renderer, render, raw, Page } = require ('tagscript')

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
  let tm = core.parse (str)
  let x = store.eval (tm)
  return core.toSvg (store.trace (x) .heap)
}


const style = 
`<style>
  .box {
    border:1px solid black;
    padding:.5em;
    margin:0 -1px -1px 0;
    margin:2px 0 1rem;
    display:inline-block;
    vertical-align:top;
  }
  .box .input {
    display:block;
    align:auto 0;
    text-align:center;
    background:#eee;
    border-radius:4px;
    padding:3px 2px;
    margin-bottom:1em;
    border:1px solid #ccc;
  }
  text {
  	font-size:16.5;
  	fill:black;
  	text-anchor:middle;
  	font-style:italic;
  }
  text.return {
    font-style:normal;
  }
  path, rect {
    fill:none;
    stroke:black;
  }
  rect {
    stroke:#0962;
  }
  text {
    text-anchor:middle;
    fill:black;
  }
  path.node {
    fill:#fff6;
  }
  path.false {
	stroke-dasharray:3,3;
  }
</style>`
  


function main (samples) {
  log (style)
  samples
    .filter (sample => sample != null)
    .forEach (sample => {
      log ('<div class=box>\n<code class=input>', sample, '</code>')
      log (exec (sample))
      log ('</div>')
    })
}

const samples = require ('./samples')
main (samples)

