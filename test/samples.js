const samples =
  [
  , 'any'
  , 'bottom'
  , '1'
  , '2'
  , 'true'
  , '"string"'
  , 'false'
  , 'null'
  , 'number'
  , 'object'
  , 'array'
  , 'string'
  , 'boolean'
  , null
  , '1 & name:any' // Question... should this not rather be equivalent to bottom ?

  , null
  , 'string | "1"'
  , '2 & 1'
  , '3 & <4' 
  , 'name:"joe" & flag?:boolean'
  , 'a:1 | b:2'
  , 'a:>1 | b:<1'
  , 'type:"click" -> clientX:number & clientY:number'
  , null

  , '<1 & <2'
  , '<2 & <1'
  , '<1 | <2'
  , '<2 | <1'
  , '<1 & <2 & <3'
  , '<1 | <2 | <3'
  , '<1'
  , '<3'
  , '<=3'
  , '>3'
  , '>=3'
  , '3'
  , '>10 & <20'
  , '<1 & >2'
  , '<3 | >=3'
  , null

  , 'number'
  , '!string'
  , '!number'
  , 'number | !number'
  , 'number & string'
  , 'number & !string'
  , 'number & !string <-> number'
  , '!number & !string'
  , 'number | string'
  , 'number | !string'
  , 'number | !string <-> !string'
  , '!number | !string'
  , 'boolean & number'
  , 'boolean'
  , 'boolean | number'
  , 'number & boolean'
  , 'string | (number & boolean)'
  , 'boolean'
  , '!boolean'
  , 'false'
  , 'true'
  , 'true | false'
  , 'true | boolean'
  , 'boolean & !(true | false)'
  , '!true | !false'
  , null

  , '"joe"'
   , `"Hello, \\n\\t World!"`
  , `"U\\u0041BC"`
  , '"joe" & "fred"'
  , '"joe" | "fred"'
  , '!"joe" & !"fred"'
  , '!"joe" | !"fred"'
  , null

  , '"joe" & string'
  , '"joe" & !string'
  , '"joe" | string'
  , '!"joe" & string'
  , '!"joe" & !string'
  , null

  ]

globalThis.samples = samples