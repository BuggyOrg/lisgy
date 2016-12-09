# lisgy ![Build status](https://api.travis-ci.org/BuggyOrg/lisgy.svg?branch=rewrite)
Create Buggy graphs from Lisp-like code.

```clojure
(defco newCoName [inputA inputB] 
  {:output1 (math/less inputA inputB) 
   :output2 (math/add inputA inputB)})
```

**REWRITE TODO**

- [ ] lambdas
  - [ ] `(lambda [var_0 ... var_n] expressions)` where only the last expression is 'returned'
  - [ ] `(fn [var_0 ... var_n] expressions)` where only the last expression is 'returned'
  - [x] `#(expression)` where `%1`...`%n` are implicit arguments, i.e. `#(math/add %1 %2)` is the same as `(lambda [%1 %2] (math/add %1 %2))`
- [ ] `(let [VARS] EXPRS)`
- [x]  extra Node data `(FN ARGS {:data 'Some data'})` or `(defco [ARGS] ... {:data 'Some data'})`
- [ ] `(port EXPRS)`


--------------------------------------------------------

**OLD README**



**TODO**
- [ ] Anonymous functions `#(...)`
- [ ] Better error handling with lines for components/edn objects

**DONE**
- [x] set a specific input port e.g. `(FN :portB (exprs1) :portA (exprs2))`
- [x] get a specific output port with `(port :outputPort node)`
- [x] let
- [x] support for new components with just one default output port
- [x] if same as logic/mux -> `(defco if [check truePath falsePath] (logic/mux truePath falsePath check))`
- [x] `(import ...)` Include default mappings e.g. + to math/add 
- [x] Extra node infos with `{:var value}`
- [x] syntax errors with lines

**API**
```clojure
; new component with named output ports
(defco name [inputs*] [:output (exprs1) ...])

; new component with just one output port (default name 'value')
(defco name [inputs*] (exprs1))

; Anonymous functions 
(lambda [args] (...))
(fn [args] (...))

; Define
(def name value)
; Example: use + instead of math/add
(def + math/add)
(+ 2 3)

; Let
(let [var1 (exprs1) var2 (exprs2) ...]
     ... ; use new variables
         ; only the last exprs node is 'returned'
     )
; Example
(stdout
  (let [a 5
        txt "some text"
        tt "check true"
        ff "check false"
        check (< a 3)]
        (stdout txt)
        (if check tt ff)))


; Import
(import all) ; or math,logic,io,control,functional,array,translator
(+ 2 3)


; Set extra node infos, e.g. the name with {}
(+ 2 3 {:name add23})


; Intern
; Define the ports of a extern component
(defcop name [inputs*] [outputs*])




; TODO / NYI (Not yet implemented) !!!
; Anonymous functions 
#(...) ; with %n for the nth arg (1-based)
```

## example code

```lisp
(def add math/add) ; rename math/add to add
(defcop add [s1 s2] [sum]) ; define the input/output ports for add
(def mul math/multiply) ; rename math/multiply to mul
; lisgy will get the defcop for math/ multiply automatic

; define a new component 'add2' with a default output port 'value' and the input port 'a''
(defco add2 [a] (add a 2)) 
(defco sub [a b] (add a (mul b -1)))
(defco math 
  [a b] 
  [:add (add a b)
   :mul (mul a b)
   :sub (sub a b)
   :a2 (add2 a)
   :b2 (add2 b)])

(defco math2
  [a]
  (let [* mul
        a2 (* a 2)]
        (* a2 8)))

; full example
(defcop math/less [isLess than] [value])
(defcop math/add [s1 s2] [sum])
(def + math/add)
(def < math/less)

(defco test [a b] [:add (+ a b) 
                   :less (< a b) 
                   :fn (fn [c d] (< (+ a c) 
                                    (+ b d)))])

```

## cli

```bash
  Usage: lisgy [options] [command]


  Commands:

    parse [lisp_code]

  Options:
  
    -h, --help             output usage information
    -V, --version          output the version number
    -e, --elastic <host>   The elastic server to connect to. Defaults to BUGGY_COMPONENT_LIBRARY_HOST=http://localhost:9200
    -n, --nice             Pretty print all JSON output
    -k, --kgraph           Print the graph in kgraph format
    -r, --resolve          Print the resolved json
    -v, --verbose [depth]  Print further information.
    --nocolor              Disable color output


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

