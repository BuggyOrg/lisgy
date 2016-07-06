(def add math/add)
(def mul math/multiply)
(def less math/less)
(def s2n translator/string_to_number)
(def n2s translator/number_to_string)
(def mux logic/mux)
(def less math/less)
(def in io/stdin)
(def out io/stdout)

(defco if [check truePath falsePath] (mux truePath falsePath check))
; (defco while [check work] (iff check (while check work) work))
(defco x4 (x) (:out (math/multiply x (math/multiply x (math/multiply x x)))))
(if (less 2 3) (x4 42) (x4 2))

; (while (less 2 3) (mux 5 6 (less 1 4)))

;(defco A [a] (add a a))
;(defco B [a] (A a))

