# lisgy ![Build status](https://api.travis-ci.org/BuggyOrg/lisgy.svg?branch=master)
Create Buggy graphs from Lisp-like code.

```clojure
(defco newCoName [inputA inputB] 
  {:output1 (math/less inputA inputB) 
   :output2 (math/add inputA inputB)})
```

[**current rewrite status**]( https://github.com/BuggyOrg/lisgy/projects/1 )



**CLI**
```
Lisgy CLI [version <VERSION>]

Commands:
  pc [code]     Parse and compile the lisgy code
  input [file]  Use the stdin input as lisgy code or if none is given open an
                editor                                              [aliases: i]
  edit [file]   Opens an editor to edit the file [file] and use its content as
                lisgy code                                          [aliases: e]
  completion    generate bash completion script

Options:
  --help  Show help                                                    [boolean]
```


--------------------------------------------------------

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
(import math) ; Import all default math components
(import lisgy.clj) ; Import all components from lisgy.clj
(import graph.json) ; Import all components from graph.json
(+ 2 3)


; Set extra node infos, e.g. the name with {}
(+ 2 3 {:name "add23"})


; Intern
; Define the ports of a extern component
(defcop name [inputs*] [outputs*])
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
lisgy pc '(lambda (a b) (math/add a b))' > parsed.json

# with stdin
echo '(lambda (a b) (math/add a b))' | lisgy input > parsed.json

# open an editor (default nano)
lisgy input > parsed.json

# use a input file
lisgy input code.lisp -n > parsed.json
```

