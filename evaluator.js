/*
Evaluator for a non-deterministic language with booleans, conditionals,
sequences, functions, constants, variables and blocks.
(examples available on our github repo)
/* CONSTANTS: NUMBERS, STRINGS, TRUE, FALSE, NULL */

// constants (numbers, strings, booleans, null)
// are considered "self_evaluating". This means, they
// represent themselves in the syntax tree

function is_self_evaluating(stmt) {
    return is_number(stmt) ||
           is_string(stmt) ||
           is_boolean(stmt) ||
           is_null(stmt);
}

// all other statements and expressions are
// tagged lists. Their tag tells us what
// kind of statement/expression they are

function is_tagged_list(stmt, the_tag) {
    return is_pair(stmt) && head(stmt) === the_tag;
}

/* AMB OPERATOR */
/* The amb operator accepts a number of arguments
   and ambiguously returns one of them. */
function is_amb(stmt) {
    return is_tagged_list(stmt, "application") &&
           is_name(operator(stmt)) &&
           name_of_name(operator(stmt)) === "amb";
}

function amb_choices(stmt) {
    return operands(stmt);
}

function analyze_amb(exp) {
    const cfuns = map(analyze, amb_choices(exp));
    return (env, succeed, fail) => {
        function try_next(choices) {
            return is_null(choices)
                ? fail()
                : head(choices)(env,
                    succeed,
                                () =>
                              try_next(tail(choices)));
        }
        return try_next(cfuns);
    };
}

/* REQUIRE OPERATOR */
/* The require operator verifies whether a certain predicate is satisfied.
   If the predicate is not satisfied, the require operator forces
   the evaluator to backtrack and retrieve the next possible value. */
function is_require(stmt) {
    return is_tagged_list(stmt, "application") &&
           is_name(operator(stmt)) &&
           name_of_name(operator(stmt)) === "require";
}

function analyze_require(stmt) {
    const pred_func = analyze(head(operands(stmt)));
    return (env, succeed, fail) => {
        pred_func(env,
                  (pred_value, fail2) => pred_value
                                         ? succeed("satisfied require", fail2)
                                         : fail2(),
                  fail);

    };
}

/* NAMES */

// In this evaluator, the operators are referred
// to as "names" in expressions.

// Names are tagged with "name".
// In this evaluator, typical names
// are
// list("name", "+")
// list("name", "factorial")
// list("name", "n")

function is_name(stmt) {
    return is_tagged_list(stmt, "name");
}
function name_of_name(stmt) {
    return head(tail(stmt));
}

function analyze_name(stmt) {
    return (env, succeed, fail) => {
        succeed(lookup_name_value(name_of_name(stmt), env),
                fail);
    };
}

/* CONSTANT DECLARATIONS */

// constant declarations are tagged with "constant_declaration"
// and have "name" and "value" properties

function is_constant_declaration(stmt) {
   return is_tagged_list(stmt, "constant_declaration");
}
function constant_declaration_name(stmt) {
   return head(tail(head(tail(stmt))));
}
function constant_declaration_value(stmt) {
   return head(tail(tail(stmt)));
}

// evaluation of a constant declaration evaluates
// the right-hand expression and binds the
// name to the resulting value in the
// first (innermost) frame

function analyze_constant_declaration(stmt) {
    const name = constant_declaration_name(stmt);
    const value_func = analyze(constant_declaration_value(stmt));

    return (env, succeed, fail) => {
        value_func(env,
                   (value, fail2) => {
                    set_name_value(name, value, env, false);
                    succeed("constant declared", fail2);
                   },
                   fail);
    };

}

/* VARIABLE DECLARATIONS */

function is_variable_declaration(stmt) {
   return is_tagged_list(stmt, "variable_declaration");
}
function variable_declaration_name(stmt) {
   return head(tail(head(tail(stmt))));
}
function variable_declaration_value(stmt) {
   return head(tail(tail(stmt)));
}

function analyze_variable_declaration(stmt) {
    const name = variable_declaration_name(stmt);
    const value_func = analyze(variable_declaration_value(stmt));

    return (env, succeed, fail) => {
        value_func(env,
                   (value, fail2) => {
                       set_name_value(name, value, env, true);
                       succeed("variable declared", fail2);
                   },
                   fail);
    };
}

/* CONDITIONAL EXPRESSIONS */

// conditional expressions are tagged
// with "conditional_expression"

function is_conditional_expression(stmt) {
   return is_tagged_list(stmt,
                "conditional_expression");
}
function cond_expr_pred(stmt) {
   return list_ref(stmt, 1);
}
function cond_expr_cons(stmt) {
   return list_ref(stmt, 2);
}
function cond_expr_alt(stmt) {
   return list_ref(stmt, 3);
}

// the meta-circular evaluation of conditional expressions
// evaluates the predicate and then the appropriate
// branch, depending on whether the predicate evaluates to
// true or not
function analyze_conditional_expression(stmt) {

    const pred_func = analyze(cond_expr_pred(stmt));
    const cons_func = analyze(cond_expr_cons(stmt));
    const alt_func = analyze(cond_expr_alt(stmt));

    return (env, succeed, fail) => {
        pred_func(env,
                  (pred_value, fail2) => {
                   pred_value ? cons_func(env, succeed, fail2)
                              : alt_func(env, succeed, fail2);
                  },
                  fail);
        };
}

/* FUNCTION DEFINITION EXPRESSIONS */

// function definitions are tagged with "function_definition"
// have a list of "parameters" and a "body" statement

function is_function_definition(stmt) {
   return is_tagged_list(stmt, "function_definition");
}
function function_definition_parameters(stmt) {
   return head(tail(stmt));
}
function function_definition_body(stmt) {
   return head(tail(tail(stmt)));
}

// compound function values keep track of parameters, locals body
// and environment, in a list tagged as "compound_function"

function make_compound_function(parameters, locals, body, env) {
    return list("compound_function",
                parameters, locals, body, env);
}
function is_compound_function(f) {
    return is_tagged_list(f, "compound_function");
}
function function_parameters(f) {
    return list_ref(f, 1);
}
function function_locals(f) {
    return list_ref(f, 2);
}
function function_body(f) {
    return list_ref(f, 3);
}
function function_environment(f) {
    return list_ref(f, 4);
}

// evluating a function definition expression
// results in a function value. Note that the
// current environment is stored as the function
// value's environment

function analyze_function_definition(stmt) {
    const vars = function_definition_parameters(stmt);
    const locals = local_names(function_definition_body(stmt));
    const body_func = analyze(function_definition_body(stmt));
    return (env, succeed, fail) => {
        succeed(make_compound_function(vars, locals, body_func, env),
                fail);
    };
}

/* SEQUENCES */

// sequences of statements are just represented
// by tagged lists of statements by the parser.

function is_sequence(stmt) {
   return is_tagged_list(stmt, "sequence");
}
function make_sequence(stmts) {
   return list("sequence", stmts);
}
function sequence_statements(stmt) {
   return head(tail(stmt));
}
function is_empty_sequence(stmts) {
   return is_null(stmts);
}
function is_last_statement(stmts) {
   return is_null(tail(stmts));
}
function first_statement(stmts) {
   return head(stmts);
}
function rest_statements(stmts) {
   return tail(stmts);
}

// to evaluate a sequence, we need to evaluate
// its statements one after the other, and return
// the value of the last statement.
// An exception to this rule is when a return
// statement is encountered. In that case, the
// remaining statements are ignored and the
// return value is the value of the sequence.

function analyze_sequence(stmts) {
    function sequentially(fun1, fun2) {
        return (env, succeed, fail) => {
                   fun1(env,
                        (fun1_val, fail2) => fun2(env, succeed, fail2),
                        fail);
               };
    }
    function loop(first_fun, rest_funs) {
        return is_null(rest_funs)
               ? first_fun
               : loop(sequentially(first_fun,
                          head(rest_funs)),
                      tail(rest_funs));
    }
    const funs = map(analyze, stmts);
    return is_null(funs)
           ? env => undefined
           : loop(head(funs), tail(funs));

}

/* BOOLEAN OPERATIONS (&& and ||) */

function is_boolean_operation(stmt) {
    return is_tagged_list(stmt, "boolean_operation");
}

function name_of_boolean_op(stmt) {
    return head(tail(head(tail(stmt))));
}

function boolean_op_left_arg(stmt) {
    return list_ref(head(tail(tail(stmt))), 0);
}

function boolean_op_right_arg(stmt) {
    return list_ref(head(tail(tail(stmt))), 1);
}

function analyze_boolean_op(stmt) {
    const left_hand_expr_func = analyze(boolean_op_left_arg(stmt));
    const right_hand_expr_func = analyze(boolean_op_right_arg(stmt));

    return name_of_boolean_op(stmt) === "&&"
        ? analyze_logical_and(left_hand_expr_func, right_hand_expr_func)
        : analyze_logical_or(left_hand_expr_func, right_hand_expr_func);
}

function analyze_logical_and(left_hand_expr_func, right_hand_expr_func) {
    return (env, succeed, fail) => {
        left_hand_expr_func(env,
                           (val, fail2) => {
                               val ? right_hand_expr_func(env, succeed, fail2)
                                   : succeed(false, fail2);
                           },
                           fail);
    };
}

function analyze_logical_or(left_hand_expr_func, right_hand_expr_func) {
    return (env, succeed, fail) => {
        left_hand_expr_func(env,
                           (val, fail2) => {
                               val ? succeed(true, fail2)
                                   : right_hand_expr_func(env, succeed, fail2);
                           },
                           fail);
    };
}

/* FUNCTION APPLICATION */

// Applications are tagged with "application"
// and have "operator" and "operands"

function is_application(stmt) {
   return is_tagged_list(stmt, "application");
}
function operator(stmt) {
   return head(tail(stmt));
}
function operands(stmt) {
   return head(tail(tail(stmt)));
}

// primitive functions are tagged with "primitive"
// and come with a Source function "implementation"

function make_primitive_function(impl) {
    return list("primitive", impl);
}
function is_primitive_function(fun) {
   return is_tagged_list(fun, "primitive");
}
function primitive_implementation(fun) {
   return list_ref(fun, 1);
}

function analyze_application(stmt) {
    const function_func = analyze(operator(stmt));
    const arg_funcs = map(analyze, operands(stmt));
    return (env, succeed, fail) => {
        function_func(env,
                      (func, fail2) => {
                          get_args(arg_funcs, env,
                                   (args, fail3) => {
                                       execute_application(func,
                                                           args,
                                                           succeed,
                                                           fail3);
                                   },
                                   fail2);
                      },
                      fail);
    };
}

function get_args(arg_funcs, env, succeed, fail) {
    return is_null(arg_funcs)
        ? succeed(null, fail)
        : head(arg_funcs)(env,
                         // success continuation for this arg_func
                        (arg, fail2) => {
                         get_args(tail(arg_funcs),
                                      env,
                              (args, fail3) => {
                                  succeed(pair(arg, args),fail3);
                              },
                                fail2);
                        },
                      fail);
}

/* APPLY */

// function application needs to distinguish between
// primitive functions (which are evaluated using the
// underlying JavaScript), and compound functions.

// Just like deterministic Source,
// application of compound functions is done by evaluating the
// body of the function with respect to an
// environment that results from extending the function
// object's environment by a binding of the function
// parameters to the arguments and of local names to
// the special value no_value_yet.

// One difference is that we do not return the result of function
// application. Instead, we rely on the "succeed" continuation
// to use the result.

function execute_application(fun, args, succeed, fail) {
   if (is_primitive_function(fun)) {
      succeed(apply_primitive_function(fun, args), fail);
   } else if (is_compound_function(fun)) {
      const body = function_body(fun);
      const locals = function_locals(fun);
      const names = insert_all(map(name_of_name, function_parameters(fun)),
                               locals);
      const temp_values = map(x => no_value_yet,
                              locals);
      const values = append(args, temp_values);
      body(extend_environment(names, values, function_environment(fun)),
           succeed,
           fail);
   } else {
      error(fun, "Unknown function type in apply");
   }
}

// apply_in_underlying_javascript allows us
// to make use of JavaScript's primitive functions
// in order to access operators such as addition

function apply_primitive_function(fun, argument_list) {
    return apply_in_underlying_javascript(
                primitive_implementation(fun),
                argument_list);
}


// We use a nullary function as temporary value for names whose
// declaration has not yet been evaluated. The purpose of the
// function definition is purely to create a unique identity;
// the function will never be applied and its return value
// (null) is irrelevant.
const no_value_yet = () => null;

// The function local_names collects all names declared in the
// body statements. For a name to be included in the list of
// local_names, it needs to be declared outside of any other
// block or function.

function insert_all(xs, ys) {
    return is_null(xs)
        ? ys
        : is_null(member(head(xs), ys))
          ? pair(head(xs), insert_all(tail(xs), ys))
          : error(head(xs), "multiple declarations of: ");
}

function local_names(stmt) {
    if (is_sequence(stmt)) {
        const stmts = sequence_statements(stmt);
        return is_empty_sequence(stmts)
            ? null
            : insert_all(
                  local_names(first_statement(stmts)),
                  local_names(make_sequence(
                   rest_statements(stmts))));
    } else {
       return is_constant_declaration(stmt)
           ? list(constant_declaration_name(stmt))
           : is_variable_declaration(stmt)
             ? list(variable_declaration_name(stmt))
             : null;
    }
}

/* RETURN STATEMENTS */

// functions return the value that results from
// evaluating their expression

function is_return_statement(stmt) {
   return is_tagged_list(stmt, "return_statement");
}
function return_statement_expression(stmt) {
   return head(tail(stmt));
}

function analyze_return_statement(stmt) {
    const retvalue_func = analyze(return_statement_expression(stmt));
    return (env, succeed, fail) => {
        retvalue_func(env, succeed, fail);
    };
}

/* ASSIGNMENT */

function is_assignment(stmt) {
   return is_tagged_list(stmt, "assignment");
}
function assignment_name(stmt) {
   return head(tail(head(tail(stmt))));
}
function assignment_value(stmt) {
   return head(tail(tail(stmt)));
}
function analyze_assignment(stmt) {
    const name = assignment_name(stmt);
    const value_func = analyze(assignment_value(stmt));

    return (env, succeed, fail) => {
        value_func(env,
                   (value, fail2) => {
                       const old_value = lookup_name_value(name, env);
                       assign_name_value(name, value, env);
                       succeed("assignment ok",
                               () => {
                                   assign_name_value(name, old_value, env);
                                   fail2();
                               });
                       },
                       fail);
    };
}

/* BLOCKS */

// blocks are tagged with "block"
function is_block(stmt) {
    return is_tagged_list(stmt, "block");
}
function make_block(stmt) {
   return list("block", stmt);
}
function block_body(stmt) {
    return head(tail(stmt));
}

// evaluation of blocks evaluates the body of the block
// with respect to the current environment extended by
// a binding of all local names to the special value
// no_value_yet

function analyze_block(stmt) {
    const body = analyze(block_body(stmt));
    const locals = local_names(block_body(stmt));
    const temp_values = map(x => no_value_yet,
                            locals);

    return (env, succeed, fail) => {
        return body(extend_environment(locals, temp_values, env), succeed, fail);
    };
}

/* ENVIRONMENTS */

// frames are pairs with a list of names as head
// an a list of pairs as tail (values). Each value
// pair has the proper value as head and a flag
// as tail, which indicates whether assignment
// is allowed for the corresponding name

function make_frame(names, values) {
    return pair(names, values);
}
function frame_names(frame) {
    return head(frame);
}
function frame_values(frame) {
    return tail(frame);
}

// The first frame in an environment is the
// "innermost" frame. The tail operation
// takes you to the "enclosing" environment

function first_frame(env) {
   return head(env);
}
function enclosing_environment(env) {
   return tail(env);
}
function enclose_by(frame,env) {
   return pair(frame,env);
}
function is_empty_environment(env) {
   return is_null(env);
}

// set_name_value is used for let and const to give
// the initial value to the name in the first
// (innermost) frame of the given environment

function set_name_value(name, val, env, is_variable) {
    // set_value is used for setting a given value
    // at the head of given list, as well as to
    // store a boolean indicating whether the name of
    // the given value was declared as a variable or not

    function set_value(vals, val, is_variable) {
        set_head(head(vals), val);
        set_tail(head(vals), is_variable);
    }

    function scan(names, vals) {
        return is_null(names)
            ? error("internal error: name not found")
            : name === head(names)
              ? set_value(vals, val, is_variable)
              : scan(tail(names), tail(vals));
    }
    const frame = first_frame(env);
    return scan(frame_names(frame),
                frame_values(frame));
}

// name lookup proceeds from the innermost
// frame and continues to look in enclosing
// environments until the name is found

function lookup_name_value(name, env) {
    function env_loop(env) {
        function scan(names, vals) {
            return is_null(names)
                   ? env_loop(
                       enclosing_environment(env))
                   : name === head(names)
                     ? head(head(vals))
                     : scan(tail(names), tail(vals));
        }
        if (is_empty_environment(env)) {
            error(name, "Unbound name: ");
        } else {
            const frame = first_frame(env);
            const value =  scan(frame_names(frame),
                                frame_values(frame));
      if (value === no_value_yet) {
                error(name, "Name used before declaration: ");
            } else {
          return value;
      }
        }
    }
    return env_loop(env);
}

// to assign a name to a new value in a specified environment,
// we scan for the name, just as in lookup_name_value, and
// change the corresponding value when we find it,
// provided it is tagged as mutable

function assign_name_value(name, val, env) {
    function env_loop(env) {
        function scan(names, vals) {
            return is_null(names)
                ? env_loop(
                    enclosing_environment(env))
                : name === head(names)
                  ? (tail(head(vals))
                      ? set_head(head(vals), val) // the name was declared as a variable
                      : error("no assignment " +
                          "to constants allowed") )
                  : scan(tail(names), tail(vals));
        }
        if (is_empty_environment(env)) {
            error(name, "Unbound name in assignment: ");
        } else {
            const frame = first_frame(env);
            return scan(frame_names(frame),
                        frame_values(frame));
        }
    }
    return env_loop(env);
}

// applying a compound function to parameters will
// lead to the creation of a new environment, with
// respect to which the body of the function needs
// to be evaluated
// (also used for blocks)

function extend_environment(names, vals, base_env) {
    if (length(names) === length(vals)) {
        return enclose_by(
                   make_frame(names,
                      map(x => pair(x, true), vals)),
                   base_env);
    } else if (length(names) < length(vals)) {
        error("Too many arguments supplied: " +
              stringify(names) + ", " +
              stringify(vals));
    } else {
        error("Too few arguments supplied: " +
              stringify(names) + ", " +
              stringify(vals));
    }
}

// The workhorse of our evaluator is the analyze function.
// It dispatches on the kind of statement at hand, and
// invokes the appropriate analysis. Analysing a statement
// will return a function that accepts an environment
// and returns the value of the statement. Note that some
// statements may have side effects in addition to the value returned (e.g. assignment).

function analyze(stmt) {
    return is_self_evaluating(stmt)
           ? (env, succeed, fail) => succeed(stmt, fail)
         : is_name(stmt)
           ? analyze_name(stmt)
         : is_constant_declaration(stmt)
           ? analyze_constant_declaration(stmt)
         : is_variable_declaration(stmt)
           ? analyze_variable_declaration(stmt)
         : is_assignment(stmt)
           ? analyze_assignment(stmt)
         : is_conditional_expression(stmt)
           ? analyze_conditional_expression(stmt)
         : is_function_definition(stmt)
           ? analyze_function_definition(stmt)
         : is_sequence(stmt)
           ? analyze_sequence(sequence_statements(stmt))
         : is_block(stmt)
           ? analyze_block(stmt)
         : is_return_statement(stmt)
           ? analyze_return_statement(stmt)
         : is_amb(stmt)
           ? analyze_amb(stmt)
         : is_require(stmt)
           ? analyze_require(stmt)
         : is_application(stmt)
           ? analyze_application(stmt)
         : is_boolean_operation(stmt)
           ? analyze_boolean_op(stmt)
           : error(stmt, "Unknown statement type in analyze");
}

function ambeval(exp, env, succeed, fail) {
   return (analyze(exp))(env, succeed, fail);
}

/* THE GLOBAL ENVIRONMENT */

const the_empty_environment = null;

// the minus operation is overloaded to
// support both binary and unary minus

function minus(x, y) {
    if (is_number(x) && is_number(y)) {
      return x - y;
    } else {
      return -x;
    }
}

/* PRIMALITY TESTING */
/* the following set of functions enable testing of whether a number is prime */
/* Taken from SICP JS 1.2.6 */

function square(x) {
    return x * x;
}
                
function smallest_divisor(n) {
    return find_divisor(n, 2);
}

function find_divisor(n, test_divisor) {
     return square(test_divisor) > n
            ? n
            : divides(test_divisor, n)
              ? test_divisor
              : find_divisor(n, test_divisor + 1);
}

function divides(a, b) {
    return b % a === 0;
}
          
function is_prime(n) {
    return n === smallest_divisor(n);
}

/* DISTINCT */
/* The distinct function checks whether the items in a list are unique. */
/* Taken from SICP JS section 4.3.2 */

function distinct(items) {
    return is_null(items)
        ? true
        : is_null(tail(items))
          ? true
          : is_null(member(head(items), tail(items)))
            ? distinct(tail(items))
            : false;
}

// the global environment has bindings for all
// primitive functions, including the operators

const primitive_functions = list(
       list("is_null",       is_null         ),
       list("is_prime",      is_prime        ),
       list("distinct",      distinct        ),
       list("math_abs",      math_abs        ),
       list("display",       display         ),
       list("error",         error           ),
       list("list",          list            ),
       list("pair",          pair            ),
       list("head",          head            ),
       list("tail",          tail            ),
       list("+",             (x,y) => x + y  ),
       list("-",             (x,y) => minus(x, y)  ),
       list("*",             (x,y) => x * y  ),
       list("/",             (x,y) => x / y  ),
       list("%",             (x,y) => x % y  ),
       list("===",           (x,y) => x === y),
       list("!==",           (x,y) => x !== y),
       list("<",             (x,y) => x <   y),
       list("<=",            (x,y) => x <=  y),
       list(">",             (x,y) => x >   y),
       list(">=",            (x,y) => x >=  y),
       list("!",              x    =>   !   x)
       );

// the global environment also has bindings for all
// primitive non-function values, such as undefined and
// math_PI

const primitive_constants = list(
       list("undefined", undefined),
       list("math_PI"  , math_PI)
      );

// setup_environment makes an environment that has
// one single frame, and adds a binding of all names
// listed as primitive_functions and primitive_values.
// The values of primitive functions are "primitive"
// objects, see line 281 how such functions are applied

function setup_environment() {
    const primitive_function_names =
        map(f => head(f), primitive_functions);
    const primitive_function_values =
        map(f => make_primitive_function(head(tail(f))),
            primitive_functions);
    const primitive_constant_names =
        map(f => head(f), primitive_constants);
    const primitive_constant_values =
        map(f => head(tail(f)),
            primitive_constants);
    return extend_environment(
               append(primitive_function_names,
                      primitive_constant_names),
               append(primitive_function_values,
                      primitive_constant_values),
               the_empty_environment);
}

const the_global_environment = setup_environment();


/* Some global variables that help the `parse_and_eval` function */
function no_current_problem() {
    display("// There is no current problem");
}

let try_again = no_current_problem;
let final_result = null; // stores the final result of the program, useful for testing.

function parse_and_eval(input) {
    const program_block = make_block(parse(input));
    ambeval(program_block,
        the_global_environment,
        (val, next_alternative) => {
            final_result = val;
            display(output_prompt + user_print(val));

            // assign a function to try_again so that when called,
            // the result value is returned
            try_again = () => {
              next_alternative();
              return final_result;
            };
        },
        () => {
            final_result = null;
            display("There are no more values of:");
            display(input);
            try_again = no_current_problem;
        });
}

// The function user_print is necessary to
// avoid infinite recursion when printing
// circular environments
function user_print(object) {
   return is_compound_function(object)
       ? "function" +
         stringify(function_parameters(object)) +
         stringify(function_body(object)) +
         "<environment>"
       : stringify(object);
}

const input_prompt = "input:";
const output_prompt =  "result:";

/* THE READ-EVAL-PRINT LOOP */
function driver_loop() {
    function internal_loop(try_again) {
        const input = prompt(input_prompt);
        if (input === "try-again") {
            try_again();
        } else {
            const program_block = make_block(parse(input));
            display("Starting a new problem ");
            ambeval(program_block,
                the_global_environment,
                // ambeval success
                (val, next_alternative) => {
                    display(output_prompt + user_print(val));
                    return internal_loop(next_alternative);
                },
    // ambeval failure
                () => {
                    display("There are no more values of " +
                            user_print(input));
                    return driver_loop();
                });
        }
    }
    return internal_loop(
               () => {
                   display("There is no current problem");
                   return driver_loop();
               });
}

//driver_loop();
