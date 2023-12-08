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

log ('\ntest object\n--------')
log (ess `object` .test (1))
log (ess `object` .test ([]))
log (ess `object` .test (Symbol()))
log (ess `object` .test (true))
log (ess `object` .test (false))
log (ess `object` .test ('foo'))
log (ess `object` .test (x => x))

// should be true

log ('should be true')
log (ess `object` .test ({}))

log ('\ntest array\n--------')
log (ess `array` .test (1))
log (ess `array` .test ({}))
log (ess `array` .test (Symbol()))
log (ess `array` .test (true))
log (ess `array` .test (false))
log (ess `array` .test ('foo'))
log (ess `array` .test (x => x))

// should be true

log ('should be true')
log (ess `array` .test ([]))


log (ess `string & ("foo" | "bars") & length:3`)