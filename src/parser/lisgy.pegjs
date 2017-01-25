// This is a more Lisgy-specific grammar. E.g. it has direct support for
// lambda functions.

Program
  = _ expressions:((Lambda / List / AnonymousLambda) _)* {
    return expressions.map((e) => e[0])
  }

Expression
  = Number
  / Lambda
  / AnonymousLambda
  / List
  / Vector
  / TaggedExpression
  / Symbol
  / String
  / Map

BuiltInComponents
  = "lambda"
  / "fn"

Lambda
  = "(" _ ("lambda" / "fn") _ args:SymbolVector body:((_ Expression)+) ")" {
    return {
      type: 'lambda',
      arguments: args,
      body: body.map((b) => b[1]),
      location: location()
    }
  }

AnonymousLambda
  = "#" body:List {
    return {
      type: 'anonymousLambda',
      body: body.items,
      location: location()
    }
  } 

List
  = "(" _ !BuiltInComponents _ items:(Expression (__ Expression)*) _ ")" {
    return {
      type: 'list',
      items: [ items[0], ...items[1].map((i) => i[1])],
      location: location()
    }
  }

Vector
  = "[" _ items:(Expression (__ Expression)*) _ "]" {
    return {
      type: 'vector',
      items: [ items[0], ...items[1].map((i) => i[1])],
      location: location()
    }
  }

SymbolVector
  = "[" _ items:(Symbol (__ Symbol)*) _ "]" {
    return {
      type: 'symbolVector',
      items: [ items[0], ...items[1].map((i) => i[1])],
      location: location()
    }
  }

Map
  = "{" items:((":" key:Symbol _ value:Expression) ((__ ":") key:Symbol _ value:Expression)* _)? "}" {
  	const mapEntry = (entry) => ({
    	key: entry[1],
      value: entry[3]
    })
    return {
      type: 'map',
      items: [ mapEntry(items[0]), ...items[1].map(mapEntry)],
      location: location()
    }
  }

Number
  = ([0-9]+("." [0-9]+)?) {
    return {
      type: 'number',
      value: parseFloat(text(), 10),
      location: location()
    }
  }

String
  = "\"" value:(("\\\"" / [^"])*) "\"" {
    return {
      type: 'string',
      value: value.join('').replace(/\\\"/g, '"'),
      location: location()
    }
  }

TaggedExpression
  = "#" tag:Symbol expression:(Expression) {
    return {
      type: 'tag',
      tag,
      expression,
      location: location()
    }
  }

TaggedList
  = "#" tag:Symbol expression:(List) {
    return {
      type: 'tag',
      tag,
      expression,
      location: location()
    }
  }

Symbol "symbol"
  = [0-9A-Za-z.*+!\-_?$%&=<>@\/:#/\u0080-\u9fff]+ {
    return {
      type: 'symbol',
      value: text(),
      location: location()
    }
  }

_ "whitespace"
  = [, \t\n\r]* Comment?
  / Comment _

__ "delimeter"
  = [, \t\n\r]+ __?
  / Comment _
  
Comment
  = ";" [^\n\r]* [\n\r]?
