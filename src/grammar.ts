import { id } from "lib0/function";
import { GrammarCombinator } from "./combinator";
import { param } from "./combinatorFactory";

/** A grammar: rule names mapped to their definitions. */
export type Grammar<R extends string = string> = Readonly<
    Record<R, GrammarCombinator<R, never> | ParameterizedRule<R, any>>
>;

/**
 * The entries of a grammar definition, checked against the definition's own
 * keys: every entry is a combinator over exactly those rule names.
 */
type GrammarEntries<G> = {
    [K in keyof G]:
        | GrammarCombinator<keyof G & string, never>
        | ParameterizedRule<keyof G & string, any>;
};

/**
 * Purely for type checking, at runtime this is literally the identity function.
 *
 * Defines a grammar, inferring the rule names from the definition's own keys,
 * so that rule references and parameter references can be checked at the
 * definition site without having to write an explicit `Grammar<...>` annotation
 * with all the rule names.
 */
export const defineGrammar: <G extends GrammarEntries<G>>(
    grammar: G,
) => Grammar<keyof G & string> = id;

/**
 * A parameterized rule definition: the parameter names, and the rule body.
 * Inside the body, {@link param} evaluates the combinator that was passed for
 * that parameter at the call site (in the call site's scope).
 */
export type ParameterizedRule<R extends string, P extends string> = readonly [
    params: readonly P[],
    body: GrammarCombinator<R, P>,
];
