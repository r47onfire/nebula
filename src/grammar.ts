import { GrammarCombinator } from "./combinator";
import { param } from "./combinatorFactory";

/** A grammar: rule names mapped to their definitions. */
export type Grammar<R extends string> = Readonly<
    Record<R, GrammarCombinator<R, never> | ParameterizedRule<R, any>>
>;

/**
 * A parameterized rule definition: the parameter names, and the rule body.
 * Inside the body, {@link param} evaluates the combinator that was passed for
 * that parameter at the call site (in the call site's scope).
 */
export type ParameterizedRule<R extends string, P extends string> = readonly [
    params: readonly P[],
    body: GrammarCombinator<R, P>,
];
