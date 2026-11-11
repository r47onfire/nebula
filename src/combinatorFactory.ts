import {
    CombinatorBase,
    GrammarCombinator,
    GrammarOp,
    GrammarOpDef,
    opDefs,
    OpNodeShapes,
} from "./combinator";
import { ParameterizedRule } from "./grammar";

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

/** Matches the literal string `str` exactly; produces a leaf holding that text. */
export const lit = (str: string): GrammarCombinator => factory("literal", str);
/**
 * Matches the regex `pattern` anchored at the current position (the engine adds
 * the sticky `y` flag); produces a leaf holding the matched text.
 */
export const regex = (pattern: RegExp): GrammarCombinator =>
    factory("literal", [pattern.source, pattern.flags]);
/**
 * Matches any one of the given options between regex `\b` separators; the
 * result is tagged with {@link tag} and {@link CSTNode.ignored | ignored}.
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
 * Parses `node` but flags the result {@link CSTNode.ignored | ignored}: its text
 * stays in the CST (so concatenating all leaves still reproduces the source)
 * but marks it as ok to be dropped later, when you lower the CST to an AST.
 */
export const ignored: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("ignored");
/**
 * Invokes the named rule from the grammar; the result is wrapped in a node
 * {@link CSTNode.type | typed} `ruleName`, unless the rule only delegated to
 * another named rule. Extra combinators are arguments, for calling a
 * {@link ParameterizedRule | parameterized rule}.
 */
export const rule: (
    ruleName: string,
    ...args: GrammarCombinator[]
) => GrammarCombinator = factoryFactory("rule");
/**
 * Evaluates the argument combinator bound to the parameter of the enclosing
 * {@link ParameterizedRule | parameterized rule}, in the scope where that
 * argument was written. If the parameter is unbound and a `defaultValue` is
 * given, the default is evaluated instead, in the scope in effect at this
 * reference; with no default, an unbound parameter is an error.
 */
export const param: (
    parameterName: string,
    defaultValue?: GrammarCombinator | undefined,
) => GrammarCombinator = factoryFactory("param");
/**
 * Evaluates the combinator bound to the dynamic parameter by the nearest
 * enclosing {@link bind}. Dynamic parameters are ambient context: any rule
 * parsed within the bind's extent can read them without receiving them as
 * arguments. If it is unbound and a `defaultValue` is given, the default is
 * evaluated instead, in the scope in effect at this reference; with no default,
 * an unbound dynamic parameter is an error.
 */
export const ambient: (
    varName: string,
    defaultValue?: GrammarCombinator | undefined,
) => GrammarCombinator = factoryFactory("ambient");
/**
 * Parses `body` with the dynamic parameter bound to `value` for the body's
 * dynamic extent (including any rules it calls, however deep). Inside `value`,
 * {@link ambient | `ambient(p)`} still refers to the binding this one shadows,
 * so a new value can extend the old one.
 */
export const bind: (
    varName: string,
    extend: boolean,
    value: GrammarCombinator,
    body: GrammarCombinator,
) => GrammarCombinator = factoryFactory("bind");
/**
 * Matches all of `nodes` in order; the result is a flat node holding every
 * child's result.
 */
export const seq = (...nodes: GrammarCombinator[]): GrammarCombinator =>
    factory("sequence", undefined, ...nodes);
/**
 * Like {@link seq}, but the separator is attempted between the items; separator
 * results are marked {@link CSTNode.ignored | ignored}.
 */
export const ssep = (
    separator: GrammarCombinator,
    ...nodes: GrammarCombinator[]
): GrammarCombinator => factory("sequence", separator, ...nodes);
/**
 * Tries every alternative and returns the first alternative that {@link cut}
 * (whether or not it succeeded) or if none cut, the longest succeeding match
 * (the first, on ties).
 */
export const alt = (...options: GrammarCombinator[]): GrammarCombinator =>
    factory("alternatives", false, ...options);
/** Always fails, but not a hard failure. */
export const no = (): GrammarCombinator => factory("alternatives", false);
/**
 * Ordered choice: returns the first succeeding alternative, without trying
 * later ones (a later alternative is tried only if every earlier one fails
 * without {@link cut}ting).
 */
export const altFirst = (...options: GrammarCombinator[]): GrammarCombinator =>
    factory("alternatives", true, ...options);
/**
 * Matches `node` if it succeeds, otherwise succeeds empty -- unless `node`
 * failed after a {@link cut}, in which case the failure propagates.
 */
export const opt: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("optional");
/**
 * Repeats `node` greedily until it fails ordinarily; `required` = true requires
 * at least one match, false allows zero.
 */
export const rep: (
    required: boolean,
    node: GrammarCombinator,
) => GrammarCombinator = factoryFactory("repeat");
/**
 * Matches `node` separated by `joiner` (`node`, `node` `joiner` `node`, ...),
 * keeping elements and separators in one flat result.
 *
 * @param requireTwo Requires at least two `node` elements (and one `joiner` in
 *   between) if true.
 * @param allowTrailingJoiner Permits a joiner at the end (e.g. a trailing
 *   comma).
 */
export const joined: (
    joiner: GrammarCombinator,
    bodyNode: GrammarCombinator,
    requireTwo: boolean,
    allowTrailingJoiner: boolean,
) => GrammarCombinator = factoryFactory("joined");
/**
 * Evaluates `condition` as a positive {@link lookahead} (consuming no input);
 * matches `ifTrue` if it succeeds, `ifFalse` otherwise.
 */
export const if_: (
    condition: GrammarCombinator,
    ifTrue: GrammarCombinator,
    ifFalse: GrammarCombinator,
) => GrammarCombinator = factoryFactory("if");
/**
 * Parses `node` and tags the result with `tag` (the visual kind used for syntax
 * highlighting).
 */
export const tag: (tag: string, node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("tag");
/**
 * Once matched, a later failure no longer falls back to sibling alternatives;
 * `depth` is how many enclosing choice levels the commitment spans. Produces an
 * empty {@link CSTNode.ignored | ignored} node.
 */
export const cut: (depth?: any) => GrammarCombinator = factoryFactory("cut");
/**
 * Asserts that `node` matches (`positive` = true) or does not match (`positive`
 * = false) at the current position, consuming no input.
 */
export const lookahead: (
    positive: boolean,
    node: GrammarCombinator,
) => GrammarCombinator = factoryFactory("lookahead");
/** Parses `node` and fails if it matched the empty string. */
export const nonempty: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("nonempty");
/** Parses `node` and fails if the matched span contains a newline. */
export const sameline: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("sameline");
/** Always matches, consuming no input. */
export const nothing: () => GrammarCombinator = factoryFactory("nothing");
/** Always matches, consuming no input. */
export const yes = nothing;
/**
 * Parses `node` speculatively: if it fails, any {@link cut} inside it is hidden,
 * so the failure looks ordinary and enclosing alternatives can still fall
 * back.
 */
export const try_: (node: GrammarCombinator) => GrammarCombinator =
    factoryFactory("try");
/**
 * Always fails, with `message` naming what was expected. The failure carries an
 * infinite {@link cut}, so no alternative or recovery is attempted past it.
 */
export const die: (message: string) => GrammarCombinator =
    factoryFactory("die");
