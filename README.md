# lisgy
create simple buggy graphs from lisp code

```clojure
(defco newCoName [inputA inputB] 
  {:output1 (math/less inputA inputB) 
   :output2 (math/add inputA inputB)})
```

**TODO**
- [x] set a specific input port e.g. `(FN :portB (exprs1) :portA (exprs2))`
- [x] get a specific output port with `(port :outputPort node)`
- [x] let
- [x] support for new components with just one default output port
- [ ] Anonymous functions `#(...)`
- [ ] letr
- [ ] if

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

; Let
(let [var1 (exprs1) var2 (exprs2) ...]
     ... ; use new variables
     )

; Intern
; Define the ports of a extern component
(defcop name [inputs*] [outputs*])


; TODO / NYI (Not yet implemented)
; Anonymous functions 
#(...) ; with %n for the nth arg (1-based)

; Named functions
(defn name [args] (exprs1))

; Let-ref
(letr [var1 (exprs1) var2 (exprs2) ...]
     ... ; use new variables
     )
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
    -e, --elastic <host>   The elastic server to connect to. Defaults to BUGGY_COMPONENT_LIBRARY_HOST or if not set to http://localhost:9200
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
