/* 1. Integration Tests */

/* 1.1 Test Deterministic Functionality */
function test_self_evaluating() {

}

function test_functions() {

}

function test_conditional_expressions() {

}

function test_assignment() {

}

/* 1.2 Test Non-Deterministic Functionality */

/**
 * Tests the behaviour of the empty amb statement.
*/
function test_nondet_empty() {
    parse_and_eval("amb();");

    assert_equal(null, final_result);
}

/**
 * Tests the behaviour of an amb statement that never runs out of values.
*/
function test_nondet_infinite() {
    parse_and_eval("\
        const integer_from = n => amb(n, integer_from(n + 1)); \
        integer_from(1); \
    ");

    for (let i = 1; i <= 10; i=i+1) {
        assert_equal(i, final_result);
        try_again();
    }
}

/**
 * Tests whether 'require' conditions are satisfied in producing a result.
*/
function test_nondet_require() {
    parse_and_eval("function int_between(low, high) { \
            return low > high ? amb() : amb(low, int_between(low + 1, high)); \
        } \
        function is_divisible_by_3(x) { return (x % 3) === 0;} \
        let integer = int_between(4, 10); \
        require(is_divisible_by_3(integer)); \
        integer;"
    );

    assert_equal(6, final_result);
    try_again();
    assert_equal(9, final_result);
    try_again();
    assert_equal(null, final_result);
}

/**
 * Tests whether multiple amb statements give all combinations.
*/
function test_nondet_combinations() {
    parse_and_eval("list(amb(1, 2, 3), amb('a', 'b'));");

    assert_equal(list(1, "a"), final_result);
    try_again();
    assert_equal(list(1, "b"), final_result);
    try_again();
    assert_equal(list(2, "a"), final_result);
    try_again();
    assert_equal(list(2, "b"), final_result);
    try_again();
    assert_equal(list(3, "a"), final_result);
    try_again();
    assert_equal(list(3, "b"), final_result);
    try_again();
    assert_equal(null, final_result);
}

/**
 * Tests whether the evaluation of a choice is undone before proceeding to the next choice.
*/
function test_nondet_undo() {
    parse_and_eval("let num = 5; \
        function reassign_num() { num = 10; return num; } \
        amb(reassign_num(), num); \
    ");

    assert_equal(10, final_result);
    try_again();
    assert_equal(5, final_result);
}

run(
    list(
        test_nondet_empty,
        test_nondet_infinite,
        test_nondet_require,
        test_nondet_combinations,
        test_nondet_undo
   )
);
