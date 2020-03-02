Ess Expression Language
====================

Ess is an expression language for describing properties of JSON records. 
It has a nice mathematical structure, supporting the boolean algebra operations and optional and required record fields on top of primitive types, primitive values and numeric ranges. 

The Ess compiler can be used as a theorem prover for the Ess language. 
This is a consequence of the fact that it always compiles semantically equivalent expressions to the same end result, so that checking equivalence of two expressions becomes the same thing as checking equality of their compilations. 


# Syntax

### Basics
- primitive types: `boolean` `number` `string`
- null value and boolean values: `null` `true` `false`
- string values, e.g. `"string value"` `"foo"` `"bar"`
- numeric values, e.g. `-1` `3.14`
- numeric ranges, e.g. `< 2` `<= 3` `> 4` `>= 3`
- obligatory record fields: `:`, e.g. `id: number` and `type: "click"`
- optional record fields: `?:` e.g. `id?: number` and `type ?: "click"`
- negation, intersection and union, `!` `&` `|`
for example: `!null` `number & <3` and `"foo"|"bar"`
- implication and equivalence: `->`, `<->`,
for example: `true -> boolean`, `boolean <-> true | false`

### Operator Precedence

Ess uses the usual mathematical operator precedence rules. 
Thus not binds stringer than and, binds stringer than or, binds stringer than implies,
binds stronger than equivs: (`!`, `&`,  `|`, `->`, `<->`). 


### Some Examples

- `type: "click" -> clientX: number & clientY: number`
- `id: (number & >0) & name: (null|string)`


### Optional versus Nullable

Note that in Ess, optional record fields are not the same as nullable record fields. 

- `id?: number`: does not match `{id:null}` but does match `{}` and `{id:1}`. 
- `id: number|null` does not match `{}` but does match `{id:null}` and `{id:1}`. 
- `id?: number|null`: matches all of `{}`, `{id:null}` and `{id:1}`. 


## Using Ess from javascript:

```javascript
var exp = new EssExp ('type:"click" -> clientX:number & clientY:number')
exp.test (1) // => true
exp.test ({type:'click'}) // => false
exp.test ({type:'click', clientX:10, clientY:9}) // => true

exp.isTop // => false
exp.isBottom // => false
```

You can check the properties `isTop` and `isBottom` 
to see if the expression is a tautology or an inconsistency (or something in between). 

Examples:

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
