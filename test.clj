;(import all)

(defco add2 [a b] (+ a b))

(io/stdout (translator/int_to_string (add2 1 2)))
