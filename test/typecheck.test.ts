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
    main: { def: rule("nonexistent") },
    other: { def: rule("main") },
});
const goodRuleNames = defineGrammar({
    main: { def: rule("other", lit("x")) },
    other: { def: rule("main") },
});

// The same check with the keys spelled out in an annotation instead.
const badRuleNameAnnotated: Grammar<"main" | "other"> = {
    // @ts-expect-error: "nonexistent" is not a rule in this grammar
    main: { def: rule("nonexistent") },
    other: { def: rule("main") },
};

// A bare param reference in an unparameterized rule is a type error,
// whether it is the whole body or nested inside other combinators.
const badParam = defineGrammar({
    // @ts-expect-error: no parameters are in scope in a plain rule
    main: { def: param("x") },
});
const badParamNested = defineGrammar({
    // @ts-expect-error: no parameters are in scope in a plain rule
    main: { def: seq(lit("y"), param("x")) },
});

// A param reference with a default is fine in a plain rule: the default
// covers the unbound case.
const okDefaultedParam = defineGrammar({
    main: { def: seq(lit("hello "), param("notdefined", lit("world"))) },
});

// Parameterized rules: the body may use exactly its declared parameters,
// including passing one on through a rule call (call by name).
const okParameterized: ParameterizedRule<"inner", "x"> = {
    params: ["x"],
    def: rule("inner", param("x")),
};
const badParameterized: ParameterizedRule<"inner", "x"> = {
    params: ["x"],
    // @ts-expect-error: "bogus" is not one of the declared parameters
    def: rule("inner", param("bogus")),
};

// Parameterized rules inside a grammar definition, parameters and rule
// references together.
const okGrammar = defineGrammar({
    main: { def: rule("outer", lit("go")) },
    outer: { params: ["x"], def: rule("inner", param("x")) },
    inner: { params: ["y"], def: seq(param("y"), lit(";")) },
});

// Entry metadata: a consumer's per-rule data rides along next to the def,
// typed by the grammar's metadata type argument. Nebula never reads it.
type Trace = { trace: string };
const okMetadata = defineGrammar<Trace>({
    main: { def: rule("other"), trace: "main" },
    other: { def: lit("x"), trace: "other" },
});
const badMetadata = defineGrammar<Trace>({
    // @ts-expect-error: the metadata type requires a trace on every entry
    main: { def: lit("x") },
});
const annotatedMetadata: Grammar<"main", Trace> = {
    main: { def: lit("x"), trace: "main" },
};

export {
    annotatedMetadata,
    badMetadata,
    badParam,
    badParamNested,
    badParameterized,
    badRuleName,
    badRuleNameAnnotated,
    goodRuleNames,
    okDefaultedParam,
    okGrammar,
    okMetadata,
    okParameterized,
};
