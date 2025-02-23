const { EssExp } = require ('../src')
const log = console.log.bind (console)

// An Ess theorem
var exp = new EssExp ('(type:"click" -> clientX:number) & clientX?:null -> !type:"click"')


// Another theorem
var exp = new EssExp ('boolean & !true <-> false')
log (exp.isTop, '=> true')


// Not a theorem, but satisfiable
var exp = new EssExp ('boolean')
log (exp.isTop, '=> false')
log (exp.isBottom, '=> false')


// A contradiction
var exp = new EssExp ('true & !boolean')
log (exp.isTop, '=> false')
log (exp.isBottom, '=> true')
