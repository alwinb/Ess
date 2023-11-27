# Ess Expression Language

Ess is an expression language for describing properties of data structures that are built up from primitive values and nested records. 
It supports the boolean algebra operations and optional and required record fields on top of primitive types, primitive values and numeric ranges. 

## Motivation

The motivation for this project is to investigate semantic rather than proof theoretic approaches for implementing type systems; to develop new data structures for representing types, and to use the concept of **canonical representation** to decide type equivalence and subtype relationships.  

In Ess, type expressions are compiled to a decision tree datastructure that has a reduced, ordered variant to achieve canonical representation. This effectively turns the compiler into a theorem prover that can be used to decide equivalence of type expressions. Since the Ess language includes the boolean algebra operations, it can also be used to compute subtype relationships.

[bdd]: https://en.wikipedia.org/wiki/Binary_decision_diagram


## Syntax

### Basics

Primitives:

- primitive types: `boolean` `number` `string`
- null value and boolean values: `null` `true` `false`
- string values, e.g. `"Hello, World"` `"foo"` `"bar"`
- numeric values, e.g. `-1` `3.14`
- numeric ranges, e.g. `< 2` `<= 3` `> 4` `>= 3`

Record fields:

- obligatory record fields: _name_`:`_expr_, e.g. `id: number` and `type: "click"`
- optional record fields: _name_`?:`_expr_, e.g. `id?: number` and `type ?: "click"`

Booelan algebra operations:

- negation, intersection and union, `!` `&` `|`
for example: `!null` `number & <3` and `"foo"|"bar"`
- implication and equivalence: `->`, `<->`,
for example: `true -> boolean`, `boolean <-> true | false`

### Operator Precedence

Ess uses the usual mathematical operator precedence rules. 
The record field (prefix) operators _name_`:` and _name_`?:` bind strongest, so that `id: number | null` is parsed as  `(id: number) | null`. From there, 'not' binds stronger than 'and', binds stronger than 'or', binds stronger than 'implies', binds stronger than 'equivs': (`:`, `?:`, `!`, `&`,  `|`, `->`, `<->`). 


### Some Examples

- `type: "click" -> clientX: number & clientY: number`
- `id: (number & >0) & name: (null|string)`


### Optional versus Nullable

Note that in Ess, optional record fields are not the same as nullable record fields. 

- `id?: number`: does not match `{id:null}` but does match `{}` and `{id:1}`. 
- `id: (number | null)` does not match `{}` but does match `{id:null}` and `{id:1}`. 
- `id?: (number | null)`: matches all of `{}`, `{id:null}` and `{id:1}`. 


# API

There are two distinct APIs. The Ess.Store class exposes the compiler infrastructure in a neat package; it exposes the algebraic operations on Ess decision diagrams, and methods for inspecting their shared structure in memory. There is also a more limited, high level interface that works similar the the RegExp object. 

## Ess Algebra

The more low-level interface consists of a single Store class, which is used to store reduced, ordered Ess decision diagrams and provides methods that corespond to the algebraic operations on them. 

### Ess.Store

- constructor ()
- apply ([op, ...args])
- eval (ast)
- toObject (ref)
- toSvg (ref)
- toSvg ()

The following properties and methods correspond to the constants and operations of the Ess algebra.  
These result in integers that serve as references back into the store:

- top
- bot, aka. bottom
- boolean
- number
- string
- value (v)
- lt (n)
- lte (n)
- gte (n)
- gt (n)
- not (ref)
- and (ref1, ref2)
- or (ref1, ref2)
- then (ref1, ref2)
- iff (ref1, ref2)
- diam (name, ref1)
- box (name, ref1)

## EssExp

The more limited, high level API consists of a single EssExp class, and a function _ess_ that can be used to create EssExp objects with tagged template literals. 

- constructor (string)
- isTop
- isBottom
- test (input)
- assert (inpput)

### Examples

```javascript
var exp = ess `type: "click" ->
  clientX: number & clientY: number`

// Or use the constructor as follows:
// var exp = new EssExp ('type: "click" -> clientX: number & clientY: number')

exp.test (1) // => true
exp.test ({ type:'click' }) // => false
exp.test ({ type:'click', clientX:10, clientY:9 }) // => true

exp.isTop // => false
exp.isBottom // => false
```

You can check the properties `isTop` and `isBottom` 
to see if the expression is a tautology or an inconsistency (or something in between). 

```javascript
// An Ess theorem
var exp = new EssExp ('(type:"click" -> clientX:number) & clientX?:null -> !type:"click"')
exp.isTop // => true 
```

```javascript
// Another theorem
var exp = new EssExp ('boolean & !true <-> false')
exp.isTop // => true
```

```javascript
// Not a theorem, but satisfiable
var exp = new EssExp ('boolean')
exp.isTop // => false
exp.isBottom // => false
```

```javascript
// A contradiction
var exp = new EssExp ('true & !boolean')
exp.isTop // => false
exp.isBottom // => true
```
