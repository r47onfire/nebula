import { describe, expect, test } from "bun:test";
import {
    adopt,
    alt,
    ambient,
    bind,
    CSTNode,
    defineGrammar,
    donate,
    Grammar,
    lit,
    no,
    nothing,
    op,
    param,
    parseToCST,
    regex,
    rule,
    seq,
} from "../src";

const T = new URL("T:");

/** Parse with a synthetic grammar and require a full, error-free parse. */
const parsesFully = <T extends string>(
    grammar: Grammar<T>,
    start: T,
    text: string,
): CSTNode<T | "exprs"> => {
    const cst = parseToCST(text, T, 0, start, grammar, "exprs" as T);
    expect(JSON.stringify(cst)).not.toContain('"errorExpected"');
    expect(cst.span.end).toBe(text.length);
    return cst;
};

describe("parameterized rules", () => {
    test("param matches the given argument", () => {
        const grammar = defineGrammar({
            main: { def: rule("wrap", lit("("), lit(")")) },
            wrap: {
                params: ["open", "close"],
                def: seq(param("open"), rule("word"), param("close")),
            },
            word: { def: regex(/[a-z]+/) },
        });
        parsesFully(grammar, "main", "(abc)");
        // a different instance of the same rule, with different arguments
        const grammar2 = defineGrammar({
            ...grammar,
            main: { def: rule("wrap", lit("["), lit("]")) },
        });
        parsesFully(grammar2, "main", "[abc]");
    });

    test("parameters change the memo key", () => {
        const grammar = defineGrammar({
            main: { def: alt(rule("w", lit("a")), rule("w", lit("b"))) },
            w: { params: ["t"], def: seq(param("t"), lit("!")) },
        });
        // w(a) fails on this input; w(b) at the same index must still be tried fresh
        parsesFully(grammar, "main", "b!");
    });

    test("call by name on parameters", () => {
        const grammar = defineGrammar({
            main: { def: rule("outer", lit("go")) },
            // outer passes its own parameter on to inner; inner's parameter
            // must still see outer's argument, not anything of inner's
            outer: { params: ["x"], def: rule("inner", param("x")) },
            inner: { params: ["y"], def: seq(param("y"), lit(";")) },
        });
        parsesFully(grammar, "main", "go;");
    });

    test("shadowing by name", () => {
        const grammar = defineGrammar({
            main: { def: rule("outer", lit("A")) },
            outer: {
                params: ["x"],
                def: seq(rule("inner", lit("B")), param("x")),
            },
            inner: { params: ["x"], def: param("x") },
        });
        // inner's x is "B"; outer's own x is still "A" afterwards
        parsesFully(grammar, "main", "BA");
    });

    test("parameterized rule left-recursive per instance", () => {
        const grammar = defineGrammar({
            main: {
                def: seq(rule("e", lit("+")), lit(" "), rule("e", lit("-"))),
            },
            e: {
                params: ["op"],
                def: alt(
                    seq(rule("e", param("op")), param("op"), rule("num")),
                    rule("num"),
                ),
            },
            num: { def: regex(/[0-9]+/) },
        });
        parsesFully(grammar, "main", "1+2+3 4-5-6");
    });

    test("check arguments", () => {
        const needsOne = defineGrammar({
            main: { def: rule("w") },
            w: { params: ["t"], def: param("t") },
            no: { def: no() },
        });
        expect(() => parseToCST("a", T, 0, "main", needsOne, "no")).toThrow(
            "unbound rule parameter t",
        );
        const tooMany = defineGrammar({
            main: { def: rule("w", lit("a"), lit("b"), lit("c")) },
            w: { params: ["a", "b"], def: seq(param("a"), param("b")) },
            no: { def: no() },
        });
        expect(() => parseToCST("abc", T, 0, "main", tooMany, "no")).toThrow(
            "too many arguments to rule w (expected 2 but got 3)",
        );
        const plainWithArgs = defineGrammar({
            main: { def: rule("w", lit("a")) },
            w: { def: lit("a") },
            no: { def: no() },
        });
        expect(() =>
            parseToCST("a", T, 0, "main", plainWithArgs, "no"),
        ).toThrow("takes no arguments");
        const unbound = defineGrammar({
            main: { def: rule("w", lit("a")) },
            w: { params: ["t"], def: param("other") },
            no: { def: no() },
        });
        expect(() => parseToCST("a", T, 0, "main", unbound, "no")).toThrow(
            "unbound rule parameter other",
        );
    });
});

describe("dynamic parameters", () => {
    test("visible across rule boundaries", () => {
        const grammar = defineGrammar({
            main: { def: bind("term", false, lit("!"), rule("a")) },
            a: { def: rule("b") },
            b: { def: seq(lit("x"), ambient("term")) },
        });
        parsesFully(grammar, "main", "x!");
    });

    test("extent of shadowing", () => {
        const grammar = defineGrammar({
            main: {
                def: bind(
                    "t",
                    false,
                    lit("a"),
                    seq(rule("inner"), ambient("t")),
                ),
            },
            inner: { def: bind("t", false, lit("b"), ambient("t")) },
        });
        // inner sees "b"; the outer binding is in effect again afterwards
        parsesFully(grammar, "main", "ba");
    });

    test("can reference the parent value in their own definition", () => {
        const grammar = defineGrammar({
            main: {
                def: bind(
                    "t",
                    false,
                    lit("a"),
                    bind("t", false, seq(ambient("t"), lit("b")), ambient("t")),
                ),
            },
        });
        parsesFully(grammar, "main", "ab");
    });

    test("clear binding by setting it to eps", () => {
        const grammar = defineGrammar({
            main: {
                def: bind(
                    "t",
                    false,
                    lit("z"),
                    seq(
                        bind("t", false, nothing(), ambient("t")),
                        ambient("t"),
                    ),
                ),
            },
        });
        // inside the inner bind the parameter matches nothing; outside, "z" again
        parsesFully(grammar, "main", "z");
    });

    test("memoization keys on ambient context too", () => {
        const grammar = defineGrammar({
            main: {
                def: alt(
                    bind("t", false, lit("a"), rule("h")),
                    bind("t", false, lit("b"), rule("h")),
                ),
            },
            h: { def: seq(ambient("t"), lit("!")) },
        });
        // h fails under t="a" on this input; under t="b" it must be tried fresh
        parsesFully(grammar, "main", "b!");
    });

    test("can work with lexical parameters", () => {
        const grammar = defineGrammar({
            main: { def: bind("x", false, lit("D"), rule("outer", lit("L"))) },
            outer: {
                params: ["x"],
                def: seq(param("x"), rule("inner", param("x"))),
            },
            inner: {
                params: ["y"],
                def: seq(param("y"), ambient("x")),
            },
        });
        // param("x") is outer's lexical argument "L" (the dynamic binding
        // does not capture it), it passes onward as inner's "y" unchanged,
        // and ambient("x") is the dynamic binding "D"
        parsesFully(grammar, "main", "LLD");
    });

    test("can still be left-recursive", () => {
        const grammar = defineGrammar({
            main: { def: bind("op", false, lit("+"), rule("e")) },
            e: {
                def: alt(
                    seq(rule("e"), ambient("op"), rule("num")),
                    rule("num"),
                ),
            },
            num: { def: regex(/[0-9]+/) },
        });
        parsesFully(grammar, "main", "1+2");
    });

    test("unbound dynamic parameter", () => {
        const grammar = defineGrammar({
            main: { def: ambient("nope") },
            no: { def: no() },
        });
        expect(() => parseToCST("a", T, 0, "main", grammar, "no")).toThrow(
            "unbound dynamic parameter nope",
        );
    });
});

describe("parameter defaults", () => {
    test("evaluated when the parameter is unbound", () => {
        const grammar = defineGrammar({
            main: {
                def: seq(lit("hello "), param("notdefined", lit("world"))),
            },
        });
        parsesFully(grammar, "main", "hello world");
    });

    test("bound parameter wins", () => {
        const grammar = defineGrammar({
            main: { def: rule("w", lit("rulevalue")) },
            w: { params: ["x"], def: param("x", lit("default")) },
            no: { def: no() },
        });
        parsesFully(grammar, "main", "rulevalue");
        const cst = parseToCST("default", T, 0, "main", grammar, "no");
        expect(JSON.stringify(cst)).toContain('"errorExpected"');
    });

    test("omitted rule arguments leave parameters unbound for their defaults", () => {
        const grammar = defineGrammar({
            main: { def: rule("w") },
            w: {
                params: ["a", "b"],
                def: seq(param("a", lit("A")), param("b", lit("B"))),
            },
        });
        parsesFully(grammar, "main", "AB");
        const partial = defineGrammar({
            ...grammar,
            main: { def: rule("w", lit("x")) },
        });
        parsesFully(partial, "main", "xB");
    });

    test("works inside rule arguments", () => {
        const grammar = defineGrammar({
            main: { def: rule("w", param("missing", lit("abc"))) },
            w: { params: ["a"], def: param("a") },
        });
        parsesFully(grammar, "main", "abc");
    });

    test("ambient default still evaluated when no bind is in effect", () => {
        const grammar = defineGrammar({
            main: { def: seq(lit("a"), ambient("sep", lit("b"))) },
        });
        parsesFully(grammar, "main", "ab");
    });

    test("binding wins over an ambient default, resolves in the reference site's context", () => {
        const bound = defineGrammar({
            main: {
                def: bind(
                    "sep",
                    false,
                    lit("good"),
                    ambient("sep", lit("bad")),
                ),
            },
        });
        parsesFully(bound, "main", "good");
        // the default itself can read other ambient values in effect at the reference
        const nested = defineGrammar({
            main: {
                def: bind(
                    "a",
                    false,
                    lit("abc"),
                    ambient("notdefined", ambient("a")),
                ),
            },
        });
        parsesFully(nested, "main", "abc");
    });
});

describe("name adoption", () => {
    // a miniature of the shared binary-operator rule pattern: the level
    // donates its operator, the shared rule's node adopts its name
    const grammar: Grammar = {
        main: { def: rule("sum") },
        sum: {
            def: rule(
                "binary_op",
                rule("num"),
                donate(rule("sum_op")),
                rule("sum"),
                rule("num"),
                nothing(),
            ),
        },
        binary_op: {
            params: ["nomatch", "op", "lhs", "rhs", "guard"],
            def: alt(
                adopt(seq(param("lhs"), param("op"), param("rhs"))),
                param("nomatch"),
            ),
        },
        sum_op: { def: alt(rule("add"), rule("sub")) },
        add: { def: op("operator", "+") },
        sub: { def: op("operator", "-") },
        num: { def: regex(/[0-9]+/) },
    };
    const leafText = (node: CSTNode<any>): string =>
        node.text ?? node.children.map(leafText).join("");

    test("the node takes the operator's name, the operator dissolves", () => {
        const cst = parseToCST("1+2", T, 0, "main", grammar, "exprs");
        expect(cst.type).toBe("add");
        expect(cst.children.map((n) => n.type)).toEqual(["num", null, "num"]);
        // the operator's spelling stays in the tree as an ignored leaf, so
        // the leaves still reproduce the source exactly
        expect(cst.children[1]!.text).toBe("+");
        expect(cst.children[1]!.ignored).toBe(true);
        expect(leafText(cst)).toBe("1+2");
    });

    test("a donor's named children are promoted into the adopted node", () => {
        // like a reduce pipe, whose operator production captures an
        // initial value in brackets
        const payload: Grammar = {
            main: { def: rule("sum") },
            sum: {
                def: rule(
                    "binary_op",
                    rule("num"),
                    donate(rule("sum_op")),
                    rule("sum"),
                    rule("num"),
                    nothing(),
                ),
            },
            binary_op: {
                params: ["nomatch", "op", "lhs", "rhs", "guard"],
                def: alt(
                    adopt(seq(param("lhs"), param("op"), param("rhs"))),
                    param("nomatch"),
                ),
            },
            sum_op: { def: alt(rule("add"), rule("red")) },
            add: { def: op("operator", "+") },
            red: {
                def: seq(
                    op("operator", "|+>"),
                    lit("["),
                    rule("num"),
                    lit("]"),
                ),
            },
            num: { def: regex(/[0-9]+/) },
        };
        const cst = parseToCST("1|+>[2]3", T, 0, "main", payload, "exprs");
        expect(cst.type).toBe("red");
        // lhs, the captured 2, and rhs are all direct children now
        const nums = cst.children.filter((n) => n.type === "num");
        expect(nums.map(leafText)).toEqual(["1", "2", "3"]);
        expect(leafText(cst)).toBe("1|+>[2]3");
    });

    test("adoption is per instance, through left recursion", () => {
        const cst = parseToCST("1+2-3", T, 0, "main", grammar, "exprs");
        expect(cst.type).toBe("sub");
        expect(cst.children[0]!.type).toBe("add");
        expect(leafText(cst)).toBe("1+2-3");
    });

    test("no operator means no adoption", () => {
        const cst = parseToCST("1", T, 0, "main", grammar, "exprs");
        expect(cst.type).toBe("num");
    });

    test("adopt with no donated child passes the node through", () => {
        const plain: Grammar = {
            main: { def: adopt(seq(lit("a"), lit("b"))) },
        };
        const cst = parseToCST("ab", T, 0, "main", plain, "exprs");
        // the unnamed container is adopted by nobody, so the start rule's
        // own wrap names it as usual
        expect(cst.type).toBe("main");
        expect(cst.children[0]!.type).toBe(null);
    });

    test("donate with no enclosing adopt has no effect", () => {
        const plain: Grammar = {
            main: { def: seq(donate(rule("add")), lit("x")) },
            add: { def: op("operator", "+") },
        };
        const cst = parseToCST("+x", T, 0, "main", plain, "exprs");
        const add = cst.children[0]!.children[0]!;
        expect(add.type).toBe("add");
        expect(add.ignored).toBe(false);
    });
});
