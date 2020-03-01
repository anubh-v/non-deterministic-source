/* 
   Each of the functions below make use of the parse_and_eval function of the
   non-deterministic MCE in order to run a program that is presented in SICP JS.
*/

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
            require(math_abs(smith - fletcher) === 1);\
            require(math_abs(fletcher - cooper) === 1);\
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
