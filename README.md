# lisgy
create simple buggy graphs from lisp code

```clojure
(defco newCoName [inputA inputB] 
  {:output1 (math/less inputA inputB) 
   :output2 (math/add inputA inputB)})
```

**TODO**
- [x] set a specific input port e.g. `(FN :portB (exprs1) :portA (exprs2))`
- [ ] get a specific output port with `(port :outputPort node)`
- [ ] let
- [ ] support for new components with just one default output port
- [ ] Anonymous functions `#(...)`

**API**
```clojure
; new component with named output ports
(defco name [inputs*] {:output (exprs1) ...})
(defco name [inputs*] [:output (exprs1) ...])
(defco name (inputs*) (:output (exprs1) ...))

; Anonymous functions 
(lambda (args) (...))
(fn [args] (...))

; Named functions
(defn name [args] (...))

; Define
(def name value)

; Intern
; Define the ports of a extern component
(defcop name [inputs*] [outputs*])

; TODO / NYI (Not yet implemented)
; Let
(let [var1 (exprs1) var2 (exprs2) ...]
     ... ; use new variables
     )
; new component with just one output port (default name 'value')
(defco name [inputs*] (exprs1))
(defco name (inputs*) (exprs1))
; Anonymous functions 
#(...) ; with %n for the nth arg (1-based)
```

```lisp
; full example
(defcop math/less (isLess than) (value))
(defcop math/add (s1 s2) (sum))
(def + math/add)
(def < math/less)

(defco test (a b) (:add (+ a b) 
                   :less (< a b) 
                   :fn (fn [c d] (< (+ a c) 
                                    (+ b d)))))

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
lisgy parse -n '(lambda (a b) (math/add a b))' > parsed.json

# with stdin
echo '(lambda (a b) (math/add a b))' | lisgy parse -n > parsed.json

# open an editor (default nano)
lisgy parse -n > parsed.json

# use a input file
lisgy parse code.lisp -n > parsed.json
```
