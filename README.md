# Ess Expression Language

Ess is an expression language for describing properties of data structures.
It can describe boolean combinations of records with optional and required fields
on top of primitive types, numerical ranges and singleton values as types.

## Motivation

The motivation for this project is to investigate semantic rather than proof theoretic approaches for implementing type systems; to develop new data structures for representing types, and to use the concept of **canonical representation** to decide type equivalence and subtype relationships.

In Ess, type expressions are compiled to a reduced and ordered decision tree datastructure.
These decision trees uniquely represent the semantics of an Ess expression. This means that for any two Ess expressions, if they compile to the same decision tree, then the expressions are semantically equivalent.

This approach is inspired by use of Binary Decision Diagrams to compute equivalence of expressions in propositional logic; and the use of Deterministic Finite Automata to compute equivalence of regular expressions. Ess however does not compile expressions to classic BDDs but instead it uses a decision tree datastructure that is specifically designed for the Ess language itself.

This technique effectively turns the compiler into a theorem prover for the Ess language. And since Ess can express boolean combinations, it can also be used to compute subtype relationships.

[bdd]: https://en.wikipedia.org/wiki/Binary_decision_diagram


## Syntax

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

In Ess, optional record fields are not the same as nullable record fields.
Specifically the language makes a distinction between presence of a field in an object, and the value of a field in that object; and it allows testing for presence and testing for a null value with distinct expressions:

- Required, non-nullable: `id: number`.
  This matches `{ id:1 }` but it does not match `{}` nor `{ id:null }`. 
- Optional, non-nullable: `id?: number`
  This matches `{ id:1 }` and `{}` but it does not match `{ id:null }`.
- Required, nullable: `id: (number | null)` 
  This matches `{ id:null }` and `{ id:1 }` but it does not match `{ }`.
- Optional, nullable: `id?: (number | null)`: 
  This matches all of `{id:1}`, `{id:null}` and `{}`. 


# API

There are two distinct APIs. The Ess.Store class exposes the compiler infrastructure in a neat package. It exposes the algebraic operations on Ess decision diagrams, and methods for inspecting the shared structure of Ess decision diagrams in memory. There is also a more limited, high level interface that works similar to the RegExp object. 

## Ess.Store

The main interface consists of a single Ess.Store class. An Ess.Store is used to store reduced, ordered Ess decision diagrams. These decision diagrams are _canonical representations_ of Ess expressions; this means that any two Ess expressions that have the same meaning, are stored as one and the same decision diagram.

The Store class furthermore exposes methods that correspond to the algebraic signature and operations of the Ess language. 

- constructor () -> Ess.Store
- apply ([op, ...args]) -> ref
- eval (ast) -> ref
- deref (ref) -> [node_type, ...children]
- toObject (ref) -> object
- toSvg (ref) -> string
- toSvg () -> string

The following properties and methods correspond to the constants and operations of the Ess algebra.  
These result in integers that serve as references back into the store:

- top
- bot aka. bottom
+ boolean aka. bool
+ number
+ string
+ object
+ array
- value (v)
- lt (n)
- lte (n)
- gte (n)
- gt (n)
+ not (ref)
+ and (ref1, ref2)
+ or (ref1, ref2)
+ then (ref1, ref2)
+ iff (ref1, ref2)
+ diam (name, ref1)
+ box (name, ref1)

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


## License

This project is free software: you can redistribute it and/or modify it under
the terms of the [GNU Lesser General Public License][1] version 3, as published
by the Free Software Foundation.

Copyright © 2016–2020 Alwin Blok.

This project is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

[1]: ./LICENSE.md