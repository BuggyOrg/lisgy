export var logic = `
(def eq logic/equal)
(def eq? logic/equal)
(def == logic/equal)
(def = logic/equal)
(def and logic/and)
(def or logic/or)
(def not logic/not)
(def ! logic/not)
(def mux logic/mux)
(def demux logic/demux)

;(defco if [check truePath falsePath] (mux truePath falsePath check))
;(defco neq? [a b] (! (= a b)))
;(def if logic/if)
;(def neq logic/neq)
;(def neq? logic/neq)
`
