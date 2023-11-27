const { Store, core } = require ('../src/')
const log = console.log.bind (console)

const store = new Store ()
function exec (str) {
  let tm = core.parse (str)
  let x = store.eval (tm)
  return core.toSvg (store._trace (x) .heap)
  // TODO expose this as a sub-store builder
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
    padding:3px .5em;
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

