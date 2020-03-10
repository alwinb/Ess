const log = console.log.bind (console)


// Persistent Ordered Dictionaty
// AATree implementation

const defaultCompare = (a, b) => {
  let t1 = typeof a1, t2 = typeof a2
  return t1 < t2 ? -1 : t1 > t2 ? 1 : a1 < a2 ? -1 : a1 > a2 ? 1 : 0
}

const [LEFT, RIGHT] = [-1, 1]
const EMPTY = Node (null, null, 0, null, null)

class AATree {

  constructor (compare = defaultCompare, store = EMPTY) {
  	if (typeof compare !== 'function')
      throw new Error ('First argument to AATree must be a comparison function.')
    this.compare = compare
    this.store = store
  }
  
  lookup (key) { 
    return this.select (key)
  }

  select (key) {
    const { compare } = this
    let node = this.store, path = null
    while (node.level) {
      const branch = compare (key, node.key)
      path = { branch, node, parent:path }
      if (branch === 0) return new Cursor (this, path, key)
      else node = branch < 0 ? node.l : node.r }
    return new Cursor (this, path, key)
  }

  insert (...pairs) {
  	let r = this
    const l = pairs.length
    for (let i = 0; i < l; i += 2)
  		r = r.select (pairs [i]) .set (pairs [i + 1])
  	return r
  }

  forEach (fn, thisArg) {
    const pairs = this._stream ()
    let pair = pairs.next ()
    while (pair !== null) {
      fn.call (thisArg, pair.value, pair.key, this)
      pair = pairs.next ()
    }
  }

  [Symbol.iterator] () {
    return this.entries ()
  }

  values () {
    const fn = p => ({ value: p.value })
    return this._stream (fn, { done:true })
  }

  entries () {
    const fn = p => ({ value: [p.key, p.value] })
    return this._stream (fn, { done:true })
  }

  _stream (_fn = x => x, done = null) {
    let n = this.store
    const stack = []
    return { next }
    /* where */
    function next () {
      while (n !== EMPTY) {
        stack.push (n)
        n = n.l }
      if (stack.length) {
        const n_ = stack.pop ()
        n = n_.r
        return _fn (n_) }
      return done
    }
  }

}


function Cursor ({ compare }, path, key) {
  const found = path != null && path.branch === 0
  this.found = found
  this.key = found ? path.node.key : key
  this.value = found ? path.node.value : undefined
  this.set = value => new AATree (compare, set (path, key, value))
}


function Node (key, value, level, left, right) {
  return { l:left, level, key, value, r:right } }

function skew (n) { // immutable
  const { l, level } = n
  return (level && level === l.level) ?
    Node (l.key, l.value, l.level, l.l, Node (n.key, n.value, level, l.r, n.r)) :
    n }

function split (n) { // immutable
  const { level, r } = n
  return (n.level && n.level === r.r.level) ?
    Node (r.key, r.value, r.level+1, Node (n.key, n.value, n.level, n.l, r.l), r.r) : 
    n }

// `set (p, key, value)` reconstructs an (internal) AA tree from a path `p`,
// but with the value of the head node of the path set to 'value'. 

function set (p, key, value) {
  let n, r
  if (p !== null && p.branch === 0) { // found
    n = p.node
    r = Node (key, value, n.level, n.l, n.r)
    p = p.parent }
  else
    r = Node (key, value, 1, EMPTY, EMPTY)
  while (p !== null) {
    n = p.node
    r = (p.branch === RIGHT)
      ? Node (n.key, n.value, n.level, n.l, r)
      : Node (n.key, n.value, n.level, r, n.r)
    r = split (skew (r))
    p = p.parent }
  return r }


module.exports = AATree