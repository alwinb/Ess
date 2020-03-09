const log = console.log.bind (console)
const { parse } = require ('../src/parser')
const samples = require ('./samples')


var str = '"foo\\nbar\\nbaz"'
var str = 'foo:true & bar:false & (true|false) | "foo"'
var tree = parse (str)

log (str)

log(JSON.stringify(tree, null,2))


// Lets try to draw the tree then

