// Compile-time assertions for the strict grammar typing
import {
    defineGrammar,
    Grammar,
    lit,
    param,
    ParameterizedRule,
    rule,
    seq,
} from "../src";

// Rule names are inferred from the definition's own keys and checked
// against them, with no explicit annotation.
const badRuleName = defineGrammar({
    // @ts-expect-error: "nonexistent" is not a rule in this grammar
    main: rule("nonexistent"),
    other: rule("main"),
});
const goodRuleNames = defineGrammar({
    main: rule("other", lit("x")),
    other: rule("main"),
});

// The same check with the keys spelled out in an annotation instead.
const badRuleNameAnnotated: Grammar<"main" | "other"> = {
    // @ts-expect-error: "nonexistent" is not a rule in this grammar
    main: rule("nonexistent"),
    other: rule("main"),
};

// A bare param reference in an unparameterized rule is a type error,
// whether it is the whole body or nested inside other combinators.
const badParam = defineGrammar({
    // @ts-expect-error: no parameters are in scope in a plain rule
    main: param("x"),
});
const badParamNested = defineGrammar({
    // @ts-expect-error: no parameters are in scope in a plain rule
    main: seq(lit("y"), param("x")),
});

// A param reference with a default is fine in a plain rule: the default
// covers the unbound case.
const okDefaultedParam = defineGrammar({
    main: seq(lit("hello "), param("notdefined", lit("world"))),
});

// Parameterized rules: the body may use exactly its declared parameters,
// including passing one on through a rule call (call by name).
const okParameterized: ParameterizedRule<"inner", "x"> = [
    ["x"],
    rule("inner", param("x")),
];
const badParameterized: ParameterizedRule<"inner", "x"> = [
    ["x"],
    // @ts-expect-error: "bogus" is not one of the declared parameters
    rule("inner", param("bogus")),
];

// Parameterized rules inside a grammar definition, parameters and rule
// references together.
const okGrammar = defineGrammar({
    main: rule("outer", lit("go")),
    outer: [["x"], rule("inner", param("x"))],
    inner: [["y"], seq(param("y"), lit(";"))],
});

export {
    badParam,
    badParamNested,
    badParameterized,
    badRuleName,
    badRuleNameAnnotated,
    goodRuleNames,
    okDefaultedParam,
    okGrammar,
    okParameterized,
};
