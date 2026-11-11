import { GrammarCombinator } from "./combinator";
import { param } from "./combinatorFactory";

/** A grammar: rule names mapped to their definitions. */
export type Grammar = Readonly<
    Record<string, GrammarCombinator | ParameterizedRule>
>;

/**
 * A parameterized rule definition: the parameter names, and the rule body.
 * Inside the body, {@link param} evaluates the combinator that was passed for
 * that parameter at the call site (in the call site's scope).
 */
export type ParameterizedRule = readonly [
    params: readonly string[],
    body: GrammarCombinator,
];
