import {
    CombinatorBase,
    GrammarCombinator,
    GrammarOp,
    GrammarOpDef,
    opDefs,
    OpNodeShapes,
} from "./combinator";
import { ParameterizedRule } from "./grammar";
import type { CSTNode } from "./cst";
import { freeze } from "lib0/object";

const factory = <R extends string, P extends string, T extends GrammarOp>(
    type: T,
    ...args: Parameters<(typeof opDefs)[T]["create"]>
): Readonly<CombinatorBase & { readonly op: T } & OpNodeShapes<R, P>[T]> =>
    freeze({
        ...((opDefs[type] as GrammarOpDef<any>).create(...args) as OpNodeShapes<
            R,
            P
        >[T]),
        op: type,
    });
const factoryFactory =
    <T extends GrammarOp>(type: T) =>
    (...args: Parameters<(typeof opDefs)[T]["create"]>) =>
        factory(type, ...args);

/** Matches the literal string `str` exactly; produces a leaf holding that text. */
export const lit: (str: string) => GrammarCombinator<never, never> = (str) =>
    factory<never, never, "literal">("literal", str);
/**
 * Matches the regex `pattern` anchored at the current position (the engine adds
 * the sticky `y` flag); produces a leaf holding the matched text.
 */
export const regex: (pattern: RegExp) => GrammarCombinator<never, never> = (
    pattern,
) =>
    factory<never, never, "literal">("literal", [
        pattern.source,
        pattern.flags,
    ]);
/**
 * Matches any one of the given options between regex `\b` separators; the
 * result is tagged with {@link tag} and {@link CSTNode.ignored | ignored}.
 */
export const kw: (
    tag: string,
    ...options: string[]
) => GrammarCombinator<never, never> = factoryFactory("keyword") as any;
/**
 * Matches this operator, but also asserts that it doesn't also simultaneously
 * match any other longer operator defined elsewhere in the grammar.
 */
export const op: (tag: string, op: string) => GrammarCombinator<never, never> =
    factoryFactory("opsym") as any;
/**
 * Parses `node` but flags the result {@link CSTNode.ignored | ignored}: its text
 * stays in the CST (so concatenating all leaves still reproduces the source)
 * but marks it as ok to be dropped later, when you lower the CST to an AST.
 */
export const ignored: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "ignored",
) as any;
/**
 * Parses `node` and marks the resulting CST node as a name donor for the
 * nearest enclosing {@link adopt}: if the donated node lands as a direct child
 * of the node an `adopt` produces, that node takes the donor's type as its own
 * name, and the donor is flagged {@link CSTNode.ignored | ignored} (they stay in
 * the tree, so the source is still reproduced exactly, but they are dropped
 * when the CST is condensed) while any named children it captured are promoted
 * into the adopted node in its place. A donated node that never lands as a
 * direct child of an adopted node has no effect.
 */
export const donate: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "donate",
) as any;
/**
 * Parses `node`; if the result is an unnamed container with a direct child that
 * was marked by {@link donate}, the container adopts that child's type as its
 * own name (and the child dissolves into it; see {@link donate}). Named nodes,
 * leaves, error nodes, and containers with no donated child pass through
 * unchanged. This is how a shared parameterized rule (such as a generic
 * binary-operator rule) can produce nodes named after the specific thing that
 * matched inside it.
 */
export const adopt: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory("adopt") as any;
/**
 * Invokes the named rule from the grammar; the result is wrapped in a node
 * {@link CSTNode.type | typed} `ruleName`, unless the rule only delegated to
 * another named rule. Extra combinators are arguments, for calling a
 * {@link ParameterizedRule | parameterized rule}.
 */
export const rule: <
    const R extends string,
    RA extends string = never,
    P extends string = never,
>(
    ruleName: R,
    ...args: GrammarCombinator<RA, P>[]
) => GrammarCombinator<NoInfer<R | RA>, NoInfer<P>> = factoryFactory(
    "rule",
) as any;
/**
 * Evaluates the argument combinator bound to the parameter of the enclosing
 * {@link ParameterizedRule | parameterized rule}, in the scope where that
 * argument was written. If the parameter is unbound and a `defaultValue` is
 * given, the default is evaluated instead, in the scope in effect at this
 * reference; with no default, an unbound parameter is an error.
 */
export const param: {
    <const P extends string>(
        parameterName: P,
    ): GrammarCombinator<never, NoInfer<P>>;
    <R extends string = never, P extends string = never>(
        parameterName: string,
        defaultValue: GrammarCombinator<R, P>,
    ): GrammarCombinator<NoInfer<R>, NoInfer<P>>;
} = factoryFactory("param") as any;
/**
 * Evaluates the combinator bound to the dynamic parameter by the nearest
 * enclosing {@link bind}. Dynamic parameters are ambient context: any rule
 * parsed within the bind's extent can read them without receiving them as
 * arguments. If it is unbound and a `defaultValue` is given, the default is
 * evaluated instead, in the scope in effect at this reference; with no default,
 * an unbound dynamic parameter is an error.
 */
export const ambient: {
    (varName: string): GrammarCombinator<never, never>;
    <R extends string = never, P extends string = never>(
        varName: string,
        defaultValue: GrammarCombinator<R, P>,
    ): GrammarCombinator<NoInfer<R>, NoInfer<P>>;
} = factoryFactory("ambient") as any;
/**
 * Parses `body` with the dynamic parameter bound to `value` for the body's
 * dynamic extent (including any rules it calls, however deep). Inside `value`,
 * {@link ambient | `ambient(p)`} still refers to the binding this one shadows,
 * so a new value can extend the old one.
 */
export const bind: <R extends string = never, P extends string = never>(
    varName: string,
    extend: boolean,
    value: GrammarCombinator<R, P>,
    body: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory("bind") as any;
/**
 * Matches all of `nodes` in order; the result is a flat node holding every
 * child's result.
 */
export const seq = <R extends string = never, P extends string = never>(
    ...nodes: GrammarCombinator<R, P>[]
): GrammarCombinator<NoInfer<R>, NoInfer<P>> =>
    factory("sequence", undefined, ...nodes) as any;
/**
 * Like {@link seq}, but the separator is attempted between the items; separator
 * results are marked {@link CSTNode.ignored | ignored}.
 */
export const ssep = <R extends string = never, P extends string = never>(
    separator: GrammarCombinator<R, P>,
    ...nodes: GrammarCombinator<R, P>[]
): GrammarCombinator<NoInfer<R>, NoInfer<P>> =>
    factory("sequence", separator, ...nodes) as any;
/**
 * Tries every alternative and returns the first alternative that {@link cut}
 * (whether or not it succeeded) or if none cut, the longest succeeding match
 * (the first, on ties).
 */
export const alt = <R extends string = never, P extends string = never>(
    ...options: GrammarCombinator<R, P>[]
): GrammarCombinator<NoInfer<R>, NoInfer<P>> =>
    factory("alternatives", false, ...options) as any;
/** Always fails, but not a hard failure. */
export const no: () => GrammarCombinator<never, never> = () =>
    factory("alternatives", false) as any;
/**
 * Ordered choice: returns the first succeeding alternative, without trying
 * later ones (a later alternative is tried only if every earlier one fails
 * without {@link cut}ting).
 */
export const altFirst = <R extends string = never, P extends string = never>(
    ...options: GrammarCombinator<R, P>[]
): GrammarCombinator<NoInfer<R>, NoInfer<P>> =>
    factory("alternatives", true, ...options) as any;
/**
 * Matches `node` if it succeeds, otherwise succeeds empty -- unless `node`
 * failed after a {@link cut}, in which case the failure propagates.
 */
export const opt: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "optional",
) as any;
/**
 * Repeats `node` greedily until it fails ordinarily; `required` = true requires
 * at least one match, false allows zero.
 */
export const rep: <R extends string = never, P extends string = never>(
    required: boolean,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "repeat",
) as any;
/**
 * Matches `node` separated by `joiner` (`node`, `node` `joiner` `node`, ...),
 * keeping elements and separators in one flat result.
 *
 * @param requireTwo Requires at least two `node` elements (and one `joiner` in
 *   between) if true.
 * @param allowTrailingJoiner Permits a joiner at the end (e.g. a trailing
 *   comma).
 */
export const joined: <R extends string = never, P extends string = never>(
    joiner: GrammarCombinator<R, P>,
    bodyNode: GrammarCombinator<R, P>,
    requireTwo: boolean,
    allowTrailingJoiner: boolean,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "joined",
) as any;
/**
 * Evaluates `condition` as a positive {@link lookahead} (consuming no input);
 * matches `ifTrue` if it succeeds, `ifFalse` otherwise.
 */
export const if_: <R extends string = never, P extends string = never>(
    condition: GrammarCombinator<R, P>,
    ifTrue: GrammarCombinator<R, P>,
    ifFalse: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory("if") as any;
/**
 * Parses `node` and tags the result with `tag` (the visual kind used for syntax
 * highlighting).
 */
export const tag: <R extends string = never, P extends string = never>(
    tag: string,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory("tag") as any;
/**
 * Once matched, a later failure no longer falls back to sibling alternatives;
 * `depth` is how many enclosing choice levels the commitment spans. Produces an
 * empty {@link CSTNode.ignored | ignored} node.
 */
export const cut: (depth?: number) => GrammarCombinator<never, never> =
    factoryFactory("cut") as any;
/**
 * Asserts that `node` matches (`positive` = true) or does not match (`positive`
 * = false) at the current position, consuming no input.
 */
export const lookahead: <R extends string = never, P extends string = never>(
    positive: boolean,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "lookahead",
) as any;
/** Parses `node` and fails if it matched the empty string. */
export const nonempty: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "nonempty",
) as any;
/** Parses `node` and fails if the matched span contains a newline. */
export const sameline: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory(
    "sameline",
) as any;
/** Always matches, consuming no input. */
export const nothing: () => GrammarCombinator<never, never> = factoryFactory(
    "nothing",
) as any;
/** Always matches, consuming no input. */
export const yes = nothing;
/**
 * Parses `node` speculatively: if it fails, any {@link cut} inside it is hidden,
 * so the failure looks ordinary and enclosing alternatives can still fall
 * back.
 */
export const try_: <R extends string = never, P extends string = never>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<NoInfer<R>, NoInfer<P>> = factoryFactory("try") as any;
/**
 * Always fails, with `message` naming what was expected. The failure carries an
 * infinite {@link cut}, so no alternative or recovery is attempted past it.
 */
export const die: (message: string) => GrammarCombinator<never, never> =
    factoryFactory("die") as any;
