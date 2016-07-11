(defcop math/less [isLess than] [value])
(defcop math/add [s1 s2] [sum])
(def le math/less)
(def + math/add)
(defco test
       [a b]
       [:le (le a b)
        :ad (+ a b)])
(test 10 (+ 3 20))

(defco test2
       [a b c]
       [:a (math/add (math/add a b ) c)
        :b (fn [d] (math/add c d))
        :c (math/less a (math/add b c))])
(test2 1 2 3)
