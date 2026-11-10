import { GrammarCombinator } from "./combinator";
import { Span } from "./span";

/**
 * A node of the concrete syntax tree produced by the parser.
 *
 * Invariant: recursively concatenating the `text` of all leaves -- including
 * `ignored` nodes -- reproduces the original source exactly. Ignored nodes are
 * only removed in a later pass, when the CST is lowered to an AST.
 */
export type CSTNode = {
    /**
     * Functional type (usually rule name) for AST generation or direct
     * execution.
     */
    readonly type?: string | undefined;
    /**
     * True if this node is meaningless junk that does not change the AST
     * (commas, parens, whitespace/comments).
     */
    readonly ignored?: boolean;
    /** Visual kind for syntax highlighting. */
    readonly tag?: string | undefined;
    /** Text of this node; empty if a non-leaf. */
    readonly text?: string | undefined;
    /** The location identifying where this node came from. */
    readonly span: Span;
    /** Not present in non-leaf nodes. */
    readonly children?: readonly CSTNode[];
    /**
     * If set, it means this node is a fallback recovery node that should be
     * translated into a lazy syntax error.
     */
    readonly errorExpected?: GrammarCombinator;
};
