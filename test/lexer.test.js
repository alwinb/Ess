const { tokenize } = require  ('../src/lexer')
const { TokenClasses, parse:_parse } = require ('ab-parse')
const T = TokenClasses
const util = require ('util')
const log = console.log.bind (console)

function renderToken ([t, v]) {
  return `[${t} ${util.inspect (v)}] `
}

function main (samples) {
  samples
    .filter (x => x != null)
    .forEach (sample => {
      log (sample)
      log (sample.replace (/./g, '='))
      for (let token of tokenize (sample))
        process.stdout.write (renderToken (token))
      log ('\n\n')
    })
}

const samples = require ('./samples')
main (samples)