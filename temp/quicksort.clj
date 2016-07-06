

(defco fold [list fn init]
    (logic/mux
                   init
          (functional/apply (functional/partial 1 fn (array/first list)) (fold (array/rest list) fn init))
          (array/empty list)))

(defco filter [list fn]
    (fold list (functional/partial 0 (lambda (fn acc cur)
                                                 (logic/mux
                                                                  (array/prepend acc cur)
                                                         acc
                                                         (functional/apply fn cur))) fn) []))

(defco partition-left [list p]
    (filter list (functional/partial 0 (lambda (n m) (math/less m n)) p)))

(defco partition-right [list p]
    (filter list (functional/partial 0 (lambda (n m) (math/less n m)) p)))

(defco quicksort [list]
    (logic/mux
                   list
          (array/concat
                              (array/append (quicksort (partition-left (array/rest list) (array/first list))) (array/first list))
                  (quicksort (partition-right (array/rest list) (array/first list))))
          (array/empty list)))

(io/stdout (translator/array_to_string (quicksort (translator/string_to_array (io/stdin)))))
