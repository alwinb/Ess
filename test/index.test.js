const { EssExp, ess, Store, core } = require ('../src/')
const { parse, compile } = core
const log = console.log.bind (console)

// var e = ess `type:"click" -> clientX:number & clientY:number`
// log (e.test ({ type:'click', clientX:1, clientY:1 }))
// e.test ({})
// e.test ({ })
// e.test ({ type:'click'})

var r
var e = ess `1`
r = e.test (NaN)
log (r)

var e = ess `null`


r = e.test (NaN)
r = e.test (null)
log (r)

var s = new Store 
compile ('null', s)
log (s.heap)


log (ess `name?:any & 1` .test (1))
log (ess `1 | 2 | false` .test (true))