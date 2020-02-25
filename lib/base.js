const Map = require('./aatree')

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

// ## Stores
// Stores implement their own memory structure for efficient storage and traversal. 
// Their memory ('heap') is modeled as a sequence of structs that may contain pointers
// to other structs in the sequence. The type of these structs is specified
// by a signature functor `F`. 
//
// `Shared` is a constructor for stores that maintain their heap to be 
// 'maximally (subterm) shared'. This implies that any two equivalent terms
// will be stored at the same address (position in the sequence), so that
// comparison of terms that are stored in the same `Shared` store
// becomes a constant time operation. 
//
// `F_cmp` is a function that lifts a total order `cmp_X` on `X`
// to a total order `F_cmp(cmp_X)` on `FX`, where `F` is the signature of the structs. 

/* It might be a good idea to store the functor here too, the fold as well */

function Shared (F_cmp) {
  const _heap = []
  let _refs = new Map (F_cmp (cmpJs))

  this._reify = () => _heap
  this.out = x => _heap[x] // X -> FX

  this.inn = function inn (fx) { // FX -> X
    var cursor = _refs.lookup (fx)
    if (cursor.found) return cursor.value
    var x = _heap.push(fx) - 1
    _refs = cursor.set(x)
    return x
  }
}

// ## Recursion patterns and traversals
// taking the morphism part of a functor F as argument. 

const fold = F => (out, inn, x) => { // out: X -> FX; inn: FY -> Y; x: X
  const F_fix = F (fix)
  function fix (x) { return inn (F_fix (out (x))) }
  return fix (x)
}

// Hmm, I don't find this memo pretty, TODO!
function mem_fold (F) {
  return function (memo, out, inn, x) {
    const F_fix = F (fix)
    return fix (x)
    /* where */
    function fix (x) { 
      var cursor = memo.v.lookup (x)
      if (cursor.found) {
        /* console.log('shared', x); /**/
        return cursor.value }
      var y = inn (F_fix (out (x)))
      memo.v = memo.v.insert (x, y)
      return y
    }
  }
}

module.exports =
  { fold, mem_fold, Shared }
