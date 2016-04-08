# lisgy
create simple buggy graphs from lisp code

**currently only lambdas are supported!**

```lisp
(lambda (args) (fn))
; eg
(lambda (a b c) (math/less a (math/add b c)))
; will be converted internaly to
(defco math/less (isLess than) (value))
(defco math/add (s1 s2) (sum))
(lambda (a b c) (math/less a (math/add b c)))

```

## cli

```bash
  Usage: lisgy [options] [command]


  Commands:

    parse [lisp_code]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -n, --nice     Pretty print all JSON output
    -s, --silent   Only print data no further information.
```

### installation
```bash
npm i @buggyorg/lisgy
```

alternativ via git
```bash
git clone https://github.com/BuggyOrg/lisgy.git
# global
cd lisgy
npm i -g
# or as alias
npm i
alias lisgy='PATH TO LISGY FOLDER/lib/cli.js'
```

### examples

```bash
lisgy parse -n '(lambda (a b) (math/add a b))'

# with stdin
echo '(lambda (a b) (math/add a b))' | lisgy parse -n

# open an editor (default nano)
lisgy parse -n
```


### output for (lambda (a b c) (math/less a (math/add b c)))

```json
{
  "code": "(lambda (a b c) (math/less a (math/add b c)))",
  "meta": "lambda",
  "v": "lambda_6qhdl",
  "inputPorts": {},
  "outputPorts": {
    "fn": "lambda"
  },
  "data": {
    "v": "lambda_byphj",
    "name": "lambda_svjjj",
    "outputPorts": {
      "value": "generic"
    },
    "inputPorts": {
      "a": "generic",
      "b": "generic",
      "c": "generic"
    },
    "implementation": {
      "nodes": [
        {
          "meta": "math/less",
          "name": "less_0"
        },
        {
          "meta": "math/add",
          "name": "add_1"
        }
      ],
      "edges": [
        {
          "from": "a",
          "to": "less_0:isLess"
        },
        {
          "from": "b",
          "to": "add_1:s1"
        },
        {
          "from": "c",
          "to": "add_1:s2"
        },
        {
          "from": "add_1:sum",
          "to": "less_0:than"
        },
        {
          "from": "less_0:value",
          "to": "value"
        }
      ]
    }
  }
}

```