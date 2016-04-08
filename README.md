# lisgy


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
