;(defcop add [a b] [c])
;(defco test [a] [:o (let [b 2] (add a b))])
;(let [a 1 b 2] (add a b))

;(defcop choose [var check] [outTrue outFalse])
;(defcop join [pathOne pathTwo] [outPath])
;(defco inc [i] [:inc (math/add 1 i)])
(def = logic/equal)
(def add math/add)
(def mul math/multiply)
(def choose logic/demux)
(def join control/join)

(defco test [s1 s2] [:sum (add s1 (port :sum (add s2 3)))
                     :out2 (mul s2 2)])
(test 10 20)

(add 3 (add 10 (mul 1 2)))

; idealer syntax mit if
; (defco faculty [n]
;        [:fac (if (= n 1)
;                  n
;                  (mul (faculty (add n -1)) n))])

; wobei if im grunde wie folg definiert ist
; (defco if [check var true false]
;           [:out (let [d (demux var check)
;                       trueP (port :outTrue d)
;                       falseP (port :outFalse d)]
;                       (join true false))])

; und man faculty auch so schreiben könnte
; (defco faculty [n]
;        [:fac (let [d (choose n (= n 1))
;                    trueV (port :outTrue d)
;                    falseV (port :outFalse d)]
;                (join
;                  trueV
;                  (mul (faculty (add falseV -1)) falseV)))])

; und let dann wiederum aufgelöst wird zu
; (defco faculty [n]
;        [:fac (join
;                (port :outTrue (choose n (= n 1)))
;                (mul (faculty (add
;                                (port :outFalse (choose n (= n 1)))
;                                -1))
;                     (port :outFalse (choose n (= n 1)))))])




;(defco math/faculty (n) (:fac (
; (if (= n 1)
;   n
;   (* (math/faculty (- n 1)) n)
;))))


; (defco faculty [n] [:fac
;  (let ([d (choose n (= n 1))]
;        [trueV (port :outTrue d)]
;        [falseV (port :outFalse d)])
;    (join
;      trueV
;      (mul (faculty (add falseV -1)) falseV)
;      ))])

; is the same as
; (defco faculty2 [n] [:fac
;   (join
;     (port :outTrue (choose n (= n 1)))
;     (mul (faculty2 (add (port :outFalse (choose n (= n 1))) -1)) (port :outFalse (choose n (= n 1))))
;     )])


; (let [d (choose
;           :input n
;           :control (= :i1 n :i2 1))
;       true (port :outTrue d)
;       false (port :outFalse d)]
;   (dec false -1)
;   (mul false fac)
;   ;(port-out :fac true)
;   )
