import { freeze } from "lib0/object";
import { GrammarCombinator } from "./combinator";
import { Span } from "./span";

/**
 * A node of the concrete syntax tree produced by the parser.
 *
 * Invariant: recursively concatenating the `text` of all leaves -- including
 * `ignored` nodes -- reproduces the original source exactly. Ignored nodes are
 * only removed in a later pass, when the CST is lowered to an AST.
 */
export class CSTNode<T> {
    constructor(
        /** The location identifying where this node came from. */
        readonly span: Span,
        /**
         * Functional type (usually rule name) for AST generation or direct
         * execution.
         */
        readonly type: T | null,
        /** Not present in non-leaf nodes. */
        readonly children: readonly CSTNode<T>[] = [],
        /**
         * True if this node is meaningless junk that does not change the AST
         * (commas, parens, whitespace/comments) and can be dropped in a
         * pre-processing step.
         */
        readonly ignored: boolean = false,
        /** Visual kind for syntax highlighting. */
        readonly tag: string | null = null,
        /** Text of this node; empty if a non-leaf. */
        readonly text: string | null = null,
        /**
         * If set, it means this node is a fallback recovery node that should be
         * translated into a lazy syntax error.
         */
        readonly errorExpected?: GrammarCombinator<any, any>,
    ) {
        freeze(this.children);
        freeze(this);
    }
}
