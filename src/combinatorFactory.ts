import {
    CombinatorBase,
    GrammarCombinator,
    GrammarOp,
    GrammarOpDef,
    opDefs,
    OpNodeShapes,
} from "./combinator";

const factory = <T extends GrammarOp>(
    type: T,
    ...args: Parameters<(typeof opDefs)[T]["create"]>
): CombinatorBase & { readonly op: T } & OpNodeShapes[T] => ({
    ...((opDefs[type] as GrammarOpDef<any>).create(...args) as OpNodeShapes[T]),
    op: type,
});
const factoryFactory =
    <T extends GrammarOp>(type: T) =>
    (...args: Parameters<(typeof opDefs)[T]["create"]>) =>
        factory(type, ...args);

/** Matches the literal string `p` exactly; produces a leaf holding that text. */
export const lit = (str: string): GrammarCombinator => factory("literal", str);
/**
 * Matches the regex `p` anchored at the current position (the engine adds the
 * sticky flag); produces a leaf holding the matched text. The pattern is stored
 * as `[source, flags]` to keep combinators plain data.
 */
export const regex = (pattern: RegExp): GrammarCombinator =>
    factory("literal", [pattern.source, pattern.flags]);
/**
 * Matches any one of the given options between regex \b separators; the result
 * is tagged `t` and ignored.
 */
export const kw: (tag: string, ...options: string[]) => GrammarCombinator =
    factoryFactory("keyword");
/**
 * Matches this operator, but also asserts that it doesn't also simultaneously
 * match any other longer operator defined elsewhere in the grammar.
 */
export const op: (tag: string, op: string) => GrammarCombinator =
    factoryFactory("opsym");
/**
 * Parses `n` but flags the result `ignored`: its text stays in the CST (so
 * concatenating all leaves still reproduces the source) and it is dropped
 * later, when the CST is lowered to an AST.
 */
export const ignored: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("ignored");
/**
 * Invokes the named rule `r` from the grammar; the result is wrapped in a node
 * typed `r`, unless the rule only delegated to another named rule. Extra
 * combinators are arguments, for calling a parameterized rule.
 */
export const rule: (
    ruleName: string,
    ...args: GrammarCombinator[]
) => GrammarCombinator = factoryFactory("rule");
/**
 * Evaluates the argument combinator bound to the parameter `p` of the enclosing
 * parameterized rule, in the scope where that argument was written. If `p` is
 * unbound and a `defaultValue` is given, the default is evaluated instead, in
 * the scope in effect at this reference; with no default, an unbound parameter
 * is an error.
 */
export const param: (
    parameterName: string,
    defaultValue?: GrammarCombinator | undefined,
) => GrammarCombinator = factoryFactory("param");
/**
 * Evaluates the combinator bound to the dynamic parameter `p` by the nearest
 * enclosing {@link bind}. Dynamic parameters are ambient context: any rule
 * parsed within the bind's extent can read them without receiving them as
 * arguments. If `p` is unbound and a `defaultValue` is given, the default is
 * evaluated instead, in the scope in effect at this reference; with no default,
 * an unbound dynamic parameter is an error.
 */
export const ambient: (
    varName: string,
    defaultValue?: GrammarCombinator | undefined,
) => GrammarCombinator = factoryFactory("ambient");
/**
 * Parses `body` with the dynamic parameter `p` bound to `value` for the body's
 * dynamic extent (including any rules it calls, however deep). Inside `value`,
 * `ambient(p)` still refers to the binding this one shadows, so a new value can
 * extend the old one.
 */
export const bind: (
    varName: string,
    extend: boolean,
    value: GrammarCombinator,
    body: GrammarCombinator,
) => GrammarCombinator = factoryFactory("bind");
/**
 * Matches all of `n` in order; the result is a flat node holding every child's
 * result.
 */
export const seq = (...nodes: GrammarCombinator[]): GrammarCombinator =>
    factory("sequence", undefined, ...nodes);
/**
 * Like `seq`, but the separator `s` is attempted between the items; separator
 * results are marked ignored.
 */
export const ssep = (
    separator: GrammarCombinator,
    ...nodes: GrammarCombinator[]
): GrammarCombinator => factory("sequence", separator, ...nodes);
/**
 * Tries every alternative and returns the first alternative that cut (whether
 * or not it succeeded) or if none cut, the longest succeeding match (the first,
 * on ties).
 */
export const alt = (...options: GrammarCombinator[]): GrammarCombinator =>
    factory("alternatives", false, ...options);
/** Always fails, but not a hard failure. */
export const no = (): GrammarCombinator => factory("alternatives", false);
/**
 * Ordered choice: returns the first succeeding alternative, without trying
 * later ones (a later alternative is tried only if every earlier one fails
 * without cutting).
 */
export const altFirst = (...options: GrammarCombinator[]): GrammarCombinator =>
    factory("alternatives", true, ...options);
/**
 * Matches `n` if it succeeds, otherwise succeeds empty -- unless `n` failed
 * after a cut, in which case the failure propagates.
 */
export const opt: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("optional");
/**
 * Repeats `n` greedily until it fails ordinarily; `r` = true requires at least
 * one match, false allows zero. With several nodes the repetition cycles
 * through them.
 */
export const rep: (
    required: boolean,
    node: GrammarCombinator,
) => GrammarCombinator = factoryFactory("repeat");
/**
 * Matches `n` separated by `j` (`n`, `n` `j` `n`, ...), keeping elements and
 * separators in one flat result. `r2` requires at least two elements; `t`
 * permits a trailing separator.
 */
export const joined: (
    joiner: GrammarCombinator,
    bodyNode: GrammarCombinator,
    requireTwo: boolean,
    allowTrailingJoiner: boolean,
) => GrammarCombinator = factoryFactory("joined");
/**
 * Conditional: evaluates `c` as a lookahead (consuming no input); matches `t`
 * if it succeeds, `f` otherwise.
 */
export const if_: (
    condition: GrammarCombinator,
    ifTrue: GrammarCombinator,
    ifFalse: GrammarCombinator,
) => GrammarCombinator = factoryFactory("if");
/**
 * Parses `n` and tags the result with `t` (the visual kind used for syntax
 * highlighting).
 */
export const tag: (tag: string, node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("tag");
/**
 * Cut: once matched, a later failure no longer falls back to sibling
 * alternatives; `d` is how many enclosing choice levels the commitment spans.
 * Produces an empty ignored node.
 */
export const cut: (depth?: any) => GrammarCombinator = factoryFactory("cut");
/**
 * Asserts that `n` matches (`p` = true) or does not match (`p` = false) at the
 * current position, consuming no input.
 */
export const lookahead: (
    positive: boolean,
    node: GrammarCombinator,
) => GrammarCombinator = factoryFactory("lookahead");
/** Parses `n` and fails if it matched without consuming any input. */
export const nonempty: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("nonempty");
/** Parses `n` and fails if the matched span contains a newline. */
export const sameline: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("sameline");
/** Always matches, consuming no input. */
export const nothing: () => GrammarCombinator = factoryFactory("nothing");
/** Always matches, consuming no input. */
export const yes = nothing;
/**
 * Parses `n` speculatively: if `n` fails, any cut inside it is hidden, so the
 * failure looks ordinary and enclosing alternatives can still fall back.
 */
export const try_: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("try");
/**
 * Always fails, with `m` naming what was expected. The failure carries an
 * infinite cut, so no alternative or recovery is attempted past it.
 */
export const die: (message: string) => GrammarCombinator =
    factoryFactory("die");
