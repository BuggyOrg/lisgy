(defco reverseList-rec [list left right]
  (logic/mux
    list
    (reverseList-rec (array/swap list left right) (math/add left 1) (math/sub right 1))
    (logic/not (math/less left right))))

(defco reverseList [list]
  (logic/mux
    list
    (reverseList-rec list 0 (math/sub (array/length list) 1))
    (array/empty list)))

(io/stdout 
  (translator/array_to_string 
    (reverseList 
      (translator/string_to_array (io/stdin {:typeHint {input "[number]"}}) {:typeHint {input "[number]"}})
      {:typeHint {input "[number]"}})
      {:typeHint {input "[number]"}})
      {:typeHint {input "[number]"}})


