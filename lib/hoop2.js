const log = console.log.bind (console)

// HOOP Parser
// ===========

// 'Higher Order Operator Precedence Parser'
// :D

// Grammar Compiler
// ----------------

// ### Tokens and Token Types

// `token` is a template literal that returns a function.
// It is used to create token descriptions from a _raw_
// string, being the source of a RegExp, and a tokenRole and/ or
// additional info as arguments. 

// Tokens themselves are tuples (arrays)
// [[type, role, ...[precedence]], chunk].

// `rule` is used to specify higher order tokens/ in fact rules of
// a grammar format that is supported by the hoop parser. 

let typeId = 1
const roleMask = 0b111111111 // nine bits
const typeMask = ~roleMask

const token = (...source) => (role, ...info) =>
  [String.raw (...source) .replace (/\s+/g, ''), (typeId++ << 9) | role, ...info]

const tokenType = () => ['', typeId++ << 9] // HACK to produce typeIds, for now
const newTag = () => typeId++ << 9

// ### Tokens Roles
// Using bitflags for the token roles. 

const FlagsOnto = (map = {}, start = 0) =>
  new Proxy ({}, { get:($,k) => map [k] || (map[k] = 1 << start++) })

const Roles = { }
const { START, END, SKIP, LEAF, ASSOC, INFIX, PREFIX, POSTFIX, GROUP } = FlagsOnto (Roles)

const _token = role => (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), role]

const [start, atom, prefix, infix, assoc, postfix, end] = 
  [START, LEAF, PREFIX, INFIX, ASSOC, POSTFIX, END] .map (_token)

// const Token = { start, atom, prefix, infix, assoc, postfix, end }

// ### Lexer compiler

// `oneOf` compiles a list of token-descriptions to a RegExp that
// has an added additional method 'next (string, startpos = 0)`, to
// return `null` if no next token can be produced,
// or a token otherwise. 

function oneOf (tokens) {
  const regex = ''
  const infos = []
  const r = new RegExp (tokens.map (([src, type, ...info]) => (infos.push ({ type, info }), `(${src})`)) .join ('|'), 'ys')
  r.infos = infos
  Object.defineProperty (r, 'next', { value:next })

  function next (str, pos) {
    this.lastIndex = pos
    const match = this.exec (str)
    if (!match) return null
    let i = 1; while (match[i] == null) i++
    const { type, info } = infos[i-1]
    return [type, match[i], ...info]
  }
  return r
}

function compile (grammar) {
  const lexers = {}, types = {}
  for (const ruleName in grammar) {
    const r = grammar[ruleName]
    const { types:_types, lexer } = compileRule (ruleName, r, grammar)
    lexers [ruleName] = lexer
    types [ruleName] = _types
  }
  return { lexers, types }
}

// Two- state lexer for hoop grammars,
// compiled from a single 'rule'

function compileRule (ruleName, rule, grammar) {
  const { end, skip = {}, sig = [] } = rule
  const befores = [], afters = []
  const types = {}

  for (const k in skip) {
    const x = skip[k]
    befores.push ([x, SKIP])
    afters.push ([x, SKIP])
  }
  afters.push ([end[0], END])

  for (let i=0, l=sig.length; i<l; i++) for (const k in sig[i]) {
    let def = sig[i][k]
    let t = newTag (), info = 0

    if (typeof def[0] === 'number') { // wrapfix operator (WIP -- add end too)
      const [role, s, name, end] = def
      types[k] = t | role | GROUP
      info = [s, t | START | role, i, name]
    }

    else {
      const [rx, role] = def
      types[k] = t |= role
      info = [rx, t]
      if (!(t & LEAF)) info[2] = i
    }

    if (info[1] & (PREFIX | LEAF)) befores.push (info)
    else afters.push (info) // default precedence
  }
  
  const name = ruleName
  const Before = oneOf (befores)
  const After = oneOf (afters)
  return { name, types, lexer: {name, Before, After}}
}


// Runtime
// -------

const PRE = Symbol ('PRE '), POST = Symbol ('POST')
const _ER = /([^\n]{0,80})/ys

function Parser (lexers, S0, E0, apply = (...args) => args) { 
  let position  = 0     // current input position
  let line      = 1     // current input line
  let lastnl    = 0     // position of last newline
  let state     = PRE   // current lexer-state
  let token     = S0    // possible current input token + info (or node)
  let group     = null  // possible higher order token returned from last call
  const context = []    // stack of shunting yards
  let opener, ops, builds // ref-cache into the current shunting yard
  let lexer = lexers[S0[2]] // likewise // this is a bit hacky, REVIEW

  this.parse = parse
  return this

  /* where */

  function precedes (tok1, tok2) { // [type, value, precedence]
    // log (tok1, tok2)
    const p1 = tok1[2], p2 = tok2[2]
    return p1 > p2 ? true
      : p1 === p2 && p1[0] & roleMask === POSTFIX ? true : false
  }

  function parse (input) { do {

    // ### Token Producer

    if (group == null && token == null) {
      const regex = state === PRE ? lexer.Before : lexer.After
      token = regex.next (input, position)
      if (!token) {
        const err = position < input.length && regex.lastIndex < position
        const eof = !err
        if (err || eof && state === PRE) {
          const p = Math.max (lastnl, position-80)
          _ER.lastIndex = lastnl
          const snip = _ER.exec (input)[1]
          throw new SyntaxError (`Invalid expression. ` +
            `At line ${line}:${position - lastnl}:\n\n` +
            `\t\t${snip}\n` +
            `\t\t${'^'.padStart(position - lastnl + 1)}`)
        }
        token = E0
      }
      else if (token[1] === '\n')
        (line++, lastnl = position + 1)
      position = regex.lastIndex
    }
  
    // ### Parser

    // token :: [type+role, value, info]
    const role = group ? group[0][0] : token[0] 

    /*
    let debug = []
    for (let k in Roles)
      if (role & Roles[k]) debug.push (k)
    debug = debug.join('|')
    log (debug, token, group)
    log ({ position, lastnl }, '\n')
    //*/

    // Operator -- first apply ops of higher precedence

    let l = role & (LEAF | START | SKIP) ? -1 : ops.length-1
    for (; l >= 0; l--) {
      // TODO I suspect that this breaks with HOOPs (ie 'groups' on ops stack)
      const item = ops[l] // either an op, or a hoop
      const op = typeof item[0] === 'number' ? item : item[0]
      const useStack = role & END || precedes (op, token)
      if (!useStack) break
      ops.length--
      const arity = op[3]
      const i = builds.length - arity
      op.length = 2 // remove precedence and arity info
      builds[i] = op[0] & GROUP
        ? apply (...item.concat (builds.splice (i, arity))) // flatten hoop
        : apply (item, ...builds.splice (i, arity))
    }

    // END - Collapses the shunting yard into a 'token'

    if (role & END) {
      context.pop ()
      const [type, data1, precedence] = opener
      // Unset the START bit, add the GROUP bit
      const type_ = type & ~START | GROUP
      const hoop  = [type_, data1 + token[1]]
      const arity = type_ & PREFIX ? 1 : type_ & INFIX|ASSOC ? 2 : 0 // arity
      token = [hoop, builds[0]];
      group = token
      if (!context.length) return apply (...group)
      if (arity) hoop.push (precedence, arity)
      ;({ opener, ops, builds, lexer } = context [context.length-1])
      continue
    }

    // START - Create a new shunting yard
    // TODO this should store the state? to prevent 
    // tokenInfo from returning something invalid?

    if (role & START) { 
      opener = token
      const name = opener[3] // [type, value, precedence, lexerName]
      // log ('START', token)
      ops    = []
      builds = []
      lexer  = lexers [name]
      context.push ({ opener, ops, builds, lexer })
      state = PRE
    }

    else if (role & LEAF) { // TODO Err if state is After
      builds[builds.length] = group ? apply (...group) : apply (token)
      state = POST
    }

    else if (ops.length && (role & ASSOC) && token[0] === ops[ops.length-1][0]) {
      // FIXME op might be a hoop; how does that work; ASSOC hoops?
      ops[ops.length-1][3]++ // increment the arity
      state = PRE
    }

    else if (role & (PREFIX | INFIX | ASSOC)) { // Err if state is Before
      ops[ops.length] = token
      const op = role & GROUP ? token[0] : token // op :: [type|role, data, precedence, arity]
      op[3] = op[0] & PREFIX ? 1 : 2 // arity
      state = PRE
    }

    else if (role & POSTFIX) { // TODO Err if state is Before
      const i = builds.length-1
      if (role & GROUP) { // NB flattening HOOP
        token[0].length = 2 // remove precedence/ arity info
        builds[i] = apply (...token, builds[i])
      }
      else {
        token.length = 2 // remove precedence/ arity info
        builds[i] = apply (token, builds[i])
      }
      state = POST
    }

    group = token = null

  } while (1) }

}


// Exports
// =======

module.exports = { compile, Parser, Roles, token, tokenType, roleMask, typeMask,
  start, atom, prefix, infix, assoc, postfix, end }