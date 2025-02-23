const { core, lib:{ AATree, layout2 } } = require ('../src/index.js')

const {
  Terms, RawTerms, refold, 
  createFunctor, createRankFunction,
  createImageFunction, } = require ('../src/signatures')

const log = console.log.bind (console)

const compareJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0


// ParseTree to SVG
// ----------------

// Made with signature generic tools

// const signature = RawTerms
const signature = Terms
const F = createFunctor (signature)
const createImage = createImageFunction (signature)
const rank = createRankFunction (signature)

function toSvg (tree) {

  let visited = new WeakSet ()
  let layers = new AATree ((a,b) => -compareJs(a,b))

  refold (F) (x => x, f, tree)

  function f (sub) {
    //log ('fffff', sub)
    let r = rank (F (([r]) => r) (sub))
    let t = F (([,t]) => t) (sub)
    var p = layers.select (r)
    if (p.found) p.value.push (t)
    else layers = p.set ([t])
    return [r, t]
  }

  const C = layout2 (layers, createImage)
  return C.render()
}


// Test

// var str = '"foo\\nbar\\nbaz"'
// var str = 'foo:true & bar:false & (true|false) | "foo\\nbar"'
// var str = '<10 & name:"joe" | null & true | 3 & false | boolean | string'
// var tree = core.parse (str)
//log(JSON.stringify(tree, null,2))
//log (toSvg (tree))
// log (str)


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
    font-family:Menlo;
    font-size:11px
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
    fill:#fffd;
  }
</style>`
  


function main (samples) {
  log (style)
  samples
    .filter (sample => sample != null)
    .forEach (sample => {
      log ('<div class=box>\n<code class=input>', sample, '</code>')
      log (toSvg (core.parse (sample)))
      log ('</div>')
    })
  process.exit (205)
}

require ('./samples')
main (samples)

