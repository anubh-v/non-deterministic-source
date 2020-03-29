/** 
 * Each of the functions below make use of the parse_and_eval function of the
 * non-deterministic MCE in order to run a program that is presented in SICP JS.
 */

/**
 * Returns any integer greater than or equal to a given n.
 * Taken from SICP JS 4.3.1
 */
function an_integer_starting_from() {
    parse_and_eval("\
        function an_integer_starting_from(n) {\
            return amb(n, an_integer_starting_from(n + 1));\
        }\
        \
        an_integer_starting_from(1);\
        // gives 1 followed by 2, 3, 4, ... using the try_again function\
    ");
}

/**
 * Ambiguously returns an element from a list or
 * fails if the list is empty.
 * Taken from SICP JS 4.3.1
 */
function an_element_of() {
    parse_and_eval("\
        function an_element_of(items) {\
            require(!is_null(items));\
            return amb(head(items), an_element_of(tail(items)));\
        }\
        \
        an_element_of(list(1, 2, list(3, 4)));\
        // gives 1 followed by 2 and list(3, 4) using the try_again function\
    ");
}

/**
 * Finds a pair of integers, each from a single list
 * whose sum is prime.
 * Taken from SICP JS 4.3.1
 */
function prime_sum_pair() {
    parse_and_eval("\
        function an_element_of(items) {\
            require(!is_null(items));\
            return amb(head(items), an_element_of(tail(items)));\
        }\
        \
        function prime_sum_pair(list1, list2) {\
            const a = an_element_of(list1);\
            const b = an_element_of(list2);\
            require(is_prime(a + b));\
            return list(a, b);\
        }\
        \
        prime_sum_pair(list(1, 2, 3), list(4, 5, 6));\
        // gives list(1, 4) followed by list(1, 6), list(2, 5) and list(3, 4) using the try_again function\
    ");
}

/**
 * Returns an integer between two given bounds (inclusive).
 * SICP JS Exercise 4.26
 */
function an_integer_between() {
    parse_and_eval("\
        function an_integer_between(low, high) {\
            return low > high ? amb() : amb(low, an_integer_between(low + 1, high));\
        }\
        \
        an_integer_between(5, 10);\
        // gives 5, followed by 7, 8, 9 and 10 using the try_again function\
    ");
}

/**
 * Finds Pythagorean triples between the given bounds (inclusive).
 * Taken from SICP JS Exercise 4.26
 */
function a_pythagorean_triple_between() {
    parse_and_eval("\
        function an_integer_between(low, high) {\
            return low > high ? amb() : amb(low + 1, an_integer_between(low, high));\
        }\
        \
        function a_pythagorean_triple_between(low, high) {\
            const i = an_integer_between(low, high);\
            const j = an_integer_between(i, high);\
            const k = an_integer_between(j, high);\
            require(i * i + j * j === k * k);\
            return list(i, j, k);\
        }\
        \
        a_pythagorean_triple_between(3, 5);\
    ");
}

/**
 * Multiple Dwelling Puzzle
 * Taken from SICP JS section 4.3.2
*/
function multiple_dwelling() {
    parse_and_eval("\
        function multiple_dwelling() {\
            const baker = amb(1, 2, 3, 4, 5);\
            const cooper = amb(1, 2, 3, 4, 5);\
            const fletcher = amb(1, 2, 3, 4, 5);\
            const miller = amb(1, 2, 3, 4, 5);\
            const smith = amb(1, 2, 3, 4, 5);\
            require(distinct(list(baker, cooper, fletcher, miller, smith)));\
            require(baker !== 5);\
            require(cooper !== 1);\
            require(fletcher !== 5);\
            require(fletcher !== 1);\
            require(miller > cooper);\
            require(math_abs(smith - fletcher) !== 1);\
            require(math_abs(fletcher - cooper) !== 1);\
            return list(list('baker', baker),\
                        list('cooper', cooper),\
                        list('fletcher', fletcher),\
                        list('miller', miller),\
                        list('smith', smith));\
        }\
        const result = multiple_dwelling();\
        result;\
    ");   
}
