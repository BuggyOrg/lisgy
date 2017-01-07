Program
  = _ expressions:(Expression _)* {
    return expressions.map((e) => e[0])
  }

Expression
  = Number
  / List
  / Vector
  / TaggedExpression
  / Symbol
  / String

List
  = "(" _ items:(Expression (" " _ Expression)*) _ ")" {
    return {
      type: 'list',
      items: [ items[0], ...items[1].map((i) => i[2])],
      location: location()
    }
  }

Vector
  = "[" _ items:(Expression (" " _ Expression)*) _ "]" {
    return {
      type: 'vector',
      items: [ items[0], ...items[1].map((i) => i[2])],
      location: location()
    }
  }

// TODO
Map
  = "{" (key:Symbol _ "=" _ Expression)* "}"

Number
  = ([0-9]+("." [0-9]+)?) {
    return {
      type: 'number',
      value: parseFloat(text(), 10),
      location: location()
    }
  }

String
  = "\"" value:([0-9A-Za-z.*+!\-_?$%&=<>@\/:#/\u0080-\u9fff]*) "\"" {
    return {
      type: 'string',
      value: value.join(''),
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

Symbol
  = [0-9A-Za-z.*+!\-_?$%&=<>@\/:#/\u0080-\u9fff]+ {
    return {
      type: 'symbol',
      value: text(),
      location: location()
    }
  }

_ "whitespace"
  = [ \t\n\r]*