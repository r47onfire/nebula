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

const factory = <R extends string, P extends string, T extends GrammarOp>(
    type: T,
    ...args: Parameters<(typeof opDefs)[T]["create"]>
): CombinatorBase & { readonly op: T } & OpNodeShapes<R, P>[T] => ({
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
export const lit = <R extends string, P extends string>(
    str: string,
): GrammarCombinator<R, P> => factory("literal", str);
/**
 * Matches the regex `pattern` anchored at the current position (the engine adds
 * the sticky `y` flag); produces a leaf holding the matched text.
 */
export const regex = <R extends string, P extends string>(
    pattern: RegExp,
): GrammarCombinator<R, P> =>
    factory("literal", [pattern.source, pattern.flags]);
/**
 * Matches any one of the given options between regex `\b` separators; the
 * result is tagged with {@link tag} and {@link CSTNode.ignored | ignored}.
 */
export const kw: <R extends string, P extends string>(
    tag: string,
    ...options: string[]
) => GrammarCombinator<R, P> = factoryFactory("keyword");
/**
 * Matches this operator, but also asserts that it doesn't also simultaneously
 * match any other longer operator defined elsewhere in the grammar.
 */
export const op: <R extends string, P extends string>(
    tag: string,
    op: string,
) => GrammarCombinator<R, P> = factoryFactory("opsym");
/**
 * Parses `node` but flags the result {@link CSTNode.ignored | ignored}: its text
 * stays in the CST (so concatenating all leaves still reproduces the source)
 * but marks it as ok to be dropped later, when you lower the CST to an AST.
 */
export const ignored: <R extends string, P extends string>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("ignored") as any;
/**
 * Invokes the named rule from the grammar; the result is wrapped in a node
 * {@link CSTNode.type | typed} `ruleName`, unless the rule only delegated to
 * another named rule. Extra combinators are arguments, for calling a
 * {@link ParameterizedRule | parameterized rule}.
 */
export const rule: <R extends string>(
    ruleName: R,
    ...args: GrammarCombinator<R, any>[]
) => GrammarCombinator<R, any> = factoryFactory("rule") as any;
/**
 * Evaluates the argument combinator bound to the parameter of the enclosing
 * {@link ParameterizedRule | parameterized rule}, in the scope where that
 * argument was written. If the parameter is unbound and a `defaultValue` is
 * given, the default is evaluated instead, in the scope in effect at this
 * reference; with no default, an unbound parameter is an error.
 */
export const param: <P extends string>(
    parameterName: string,
    defaultValue?: GrammarCombinator<any, P> | undefined,
) => GrammarCombinator<any, P> = factoryFactory("param") as any;
/**
 * Evaluates the combinator bound to the dynamic parameter by the nearest
 * enclosing {@link bind}. Dynamic parameters are ambient context: any rule
 * parsed within the bind's extent can read them without receiving them as
 * arguments. If it is unbound and a `defaultValue` is given, the default is
 * evaluated instead, in the scope in effect at this reference; with no default,
 * an unbound dynamic parameter is an error.
 */
export const ambient: <R extends string, P extends string>(
    varName: string,
    defaultValue?: GrammarCombinator<R, P> | undefined,
) => GrammarCombinator<R, P> = factoryFactory("ambient") as any;
/**
 * Parses `body` with the dynamic parameter bound to `value` for the body's
 * dynamic extent (including any rules it calls, however deep). Inside `value`,
 * {@link ambient | `ambient(p)`} still refers to the binding this one shadows,
 * so a new value can extend the old one.
 */
export const bind: <R extends string, P extends string>(
    varName: string,
    extend: boolean,
    value: GrammarCombinator<R, P>,
    body: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("bind") as any;
/**
 * Matches all of `nodes` in order; the result is a flat node holding every
 * child's result.
 */
export const seq = <R extends string, P extends string>(
    ...nodes: GrammarCombinator<R, P>[]
): GrammarCombinator<R, P> => factory("sequence", undefined, ...nodes) as any;
/**
 * Like {@link seq}, but the separator is attempted between the items; separator
 * results are marked {@link CSTNode.ignored | ignored}.
 */
export const ssep = <R extends string, P extends string>(
    separator: GrammarCombinator<R, P>,
    ...nodes: GrammarCombinator<R, P>[]
): GrammarCombinator<R, P> => factory("sequence", separator, ...nodes) as any;
/**
 * Tries every alternative and returns the first alternative that {@link cut}
 * (whether or not it succeeded) or if none cut, the longest succeeding match
 * (the first, on ties).
 */
export const alt = <R extends string, P extends string>(
    ...options: GrammarCombinator<R, P>[]
): GrammarCombinator<R, P> => factory("alternatives", false, ...options) as any;
/** Always fails, but not a hard failure. */
export const no = <R extends string, P extends string>(): GrammarCombinator<
    R,
    P
> => factory("alternatives", false) as any;
/**
 * Ordered choice: returns the first succeeding alternative, without trying
 * later ones (a later alternative is tried only if every earlier one fails
 * without {@link cut}ting).
 */
export const altFirst = <R extends string, P extends string>(
    ...options: GrammarCombinator<R, P>[]
): GrammarCombinator<R, P> => factory("alternatives", true, ...options) as any;
/**
 * Matches `node` if it succeeds, otherwise succeeds empty -- unless `node`
 * failed after a {@link cut}, in which case the failure propagates.
 */
export const opt: <R extends string, P extends string>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("optional") as any;
/**
 * Repeats `node` greedily until it fails ordinarily; `required` = true requires
 * at least one match, false allows zero.
 */
export const rep: <R extends string, P extends string>(
    required: boolean,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("repeat") as any;
/**
 * Matches `node` separated by `joiner` (`node`, `node` `joiner` `node`, ...),
 * keeping elements and separators in one flat result.
 *
 * @param requireTwo Requires at least two `node` elements (and one `joiner` in
 *   between) if true.
 * @param allowTrailingJoiner Permits a joiner at the end (e.g. a trailing
 *   comma).
 */
export const joined: <R extends string, P extends string>(
    joiner: GrammarCombinator<R, P>,
    bodyNode: GrammarCombinator<R, P>,
    requireTwo: boolean,
    allowTrailingJoiner: boolean,
) => GrammarCombinator<R, P> = factoryFactory("joined") as any;
/**
 * Evaluates `condition` as a positive {@link lookahead} (consuming no input);
 * matches `ifTrue` if it succeeds, `ifFalse` otherwise.
 */
export const if_: <R extends string, P extends string>(
    condition: GrammarCombinator<R, P>,
    ifTrue: GrammarCombinator<R, P>,
    ifFalse: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("if") as any;
/**
 * Parses `node` and tags the result with `tag` (the visual kind used for syntax
 * highlighting).
 */
export const tag: <R extends string, P extends string>(
    tag: string,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("tag") as any;
/**
 * Once matched, a later failure no longer falls back to sibling alternatives;
 * `depth` is how many enclosing choice levels the commitment spans. Produces an
 * empty {@link CSTNode.ignored | ignored} node.
 */
export const cut: <R extends string, P extends string>(
    depth?: any,
) => GrammarCombinator<R, P> = factoryFactory("cut") as any;
/**
 * Asserts that `node` matches (`positive` = true) or does not match (`positive`
 * = false) at the current position, consuming no input.
 */
export const lookahead: <R extends string, P extends string>(
    positive: boolean,
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("lookahead") as any;
/** Parses `node` and fails if it matched the empty string. */
export const nonempty: <R extends string, P extends string>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("nonempty") as any;
/** Parses `node` and fails if the matched span contains a newline. */
export const sameline: <R extends string, P extends string>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("sameline") as any;
/** Always matches, consuming no input. */
export const nothing: <
    R extends string,
    P extends string,
>() => GrammarCombinator<R, P> = factoryFactory("nothing") as any;
/** Always matches, consuming no input. */
export const yes = nothing;
/**
 * Parses `node` speculatively: if it fails, any {@link cut} inside it is hidden,
 * so the failure looks ordinary and enclosing alternatives can still fall
 * back.
 */
export const try_: <R extends string, P extends string>(
    node: GrammarCombinator<R, P>,
) => GrammarCombinator<R, P> = factoryFactory("try") as any;
/**
 * Always fails, with `message` naming what was expected. The failure carries an
 * infinite {@link cut}, so no alternative or recovery is attempted past it.
 */
export const die: <R extends string, P extends string>(
    message: string,
) => GrammarCombinator<R, P> = factoryFactory("die") as any;
