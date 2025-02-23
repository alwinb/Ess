const AATree = require ('../lib/aatree.js')

//* TEST

AATree.prototype.lookup = AATree.prototype.select

const log = console.log.bind (console)

var empty = new AATree ()
var tree1 = empty.insert (1, 'Hello', 2, 'World', 3, '!!')

function logp (value, key) {
  log (key+':', value)
}

tree1.forEach (logp)

// 1: Hello
// 2: World
// 3: !!

var cursor = tree1.select (3)
log (cursor.found)

// true

var tree2 = cursor.set ('!')
tree2.forEach (logp)

// 1: Hello
// 2: World
// 3: !

var cursor = tree2.select (5)
log (cursor.found)

// false

var tree4 = cursor.set ('Welcome!')
tree4.forEach (logp)

// 1: Hello
// 2: World
// 3: !
// 5: Welcome!

///*/