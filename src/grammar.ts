import { id } from "lib0/function";
import { GrammarCombinator } from "./combinator";
import { param } from "./combinatorFactory";

/**
 * One rule of a {@link Grammar}: the rule's definition, plus -- for a
 * parameterized rule -- its parameter names (see {@link ParameterizedRule}). Any
 * further fields are metadata, typed by the grammar's metadata type parameter
 * `M`: Nebula itself never reads them; they are how a consumer keeps per-rule
 * data, such as a compile handler, next to the rule it belongs to.
 */
export type GrammarEntry<R extends string, M = unknown> = (
    NonParameterizedRule<R> | ParameterizedRule<R, any>
) &
    M;

/** A grammar: rule names mapped to their entries. */
export type Grammar<R extends string = string, M = unknown> = Readonly<
    Record<R, GrammarEntry<R, M>>
>;

/**
 * The entries of a grammar definition, checked against the definition's own
 * keys: every entry is a combinator over exactly those rule names.
 */
type GrammarEntries<G, M> = {
    [K in keyof G]: GrammarEntry<keyof G & string, M>;
};

/**
 * Purely for type checking, at runtime this is literally the identity function.
 *
 * Defines a grammar, inferring the rule names from the definition's own keys,
 * so that rule references and parameter references can be checked at the
 * definition site without having to write an explicit `Grammar<...>` annotation
 * with all the rule names.
 *
 * A metadata type for the entries' extra fields can be given explicitly as the
 * first type argument; it defaults to `unknown`, which allows no extra fields.
 */
export const defineGrammar: <
    M = unknown,
    G extends GrammarEntries<G, M> = Record<string, GrammarEntry<string, M>>,
>(
    grammar: G,
) => Grammar<keyof G & string, M> = id;

export type NonParameterizedRule<R extends string, M = unknown> = {
    def: GrammarCombinator<R, never>;
    params?: undefined;
} & M;

/**
 * Inside the body, {@link param} evaluates the combinator that was passed for
 * that parameter at the call site (in the call site's scope).
 */
export type ParameterizedRule<R extends string, P extends string> = {
    def: GrammarCombinator<R, P>;
    params: readonly P[];
};
