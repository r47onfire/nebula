import { Dynamics, GrammarCombinator, Locals } from "./combinator";
import { MatchFail } from "./parseToCST";
import { CSTNode } from "./cst";
import { Grammar } from "./grammar";
import { Memo } from "./parseToCST";
import { Span } from "./span";

/**
 * The services an operation's `call` needs from the parser: the input, the
 * grammar, the memoizing entry point for sub-parses, error recovery, and the
 * cut bookkeeping. Provided by `parseToCST`; see there for what each one does.
 */
export interface OpContext {
    readonly text: string;
    readonly memo: Memo;
    readonly grammar: Grammar;
    /**
     * Create a span for the given index
     *
     * @param begin Start index (same as {@link Span.begin})
     * @param end End index (same as {@link Span.end})
     */
    createSpan(begin: number, end: number): Span;
    applyRule(
        path: string,
        node: GrammarCombinator,
        i: number,
        locals: Locals,
        dynamics: Dynamics,
    ): CSTNode | MatchFail;
    errorNode(start: number, end: number, expected: GrammarCombinator): CSTNode;
    /**
     * Panic-mode recovery: scan forward for the next index where `item`
     * matches, turning all skipped source into a single error node. Returns the
     * index to continue parsing from. If nothing works, emits an error up to
     * end of input.
     *
     * Only used when NOT inside a committed scope. Inside one, the enclosing
     * construct owns resynchronization (seq_sep rescans for its failed child;
     * repeats emit a minimal error), so no bracket guessing is needed.
     */
    recover(
        path: string,
        item: GrammarCombinator,
        i: number,
        fail: MatchFail,
        children: CSTNode[],
        locals: Locals,
        dynamics: Dynamics,
    ): number;
    /**
     * Local recovery for a sequence with a fail after a cut. Resynchronize to
     * the nearest position where that child matches, keeping the committed
     * prefix intact. Returns the index to continue from, or null if the child
     * never matches (give up and propagate the fail).
     *
     * The skipped text becomes a BAD node that carries the recovered child in
     * its `recovered` field. This keeps the sequence's fixed arity while still
     * allowing the parse to recover later
     */
    recoverChild(
        path: string,
        child: GrammarCombinator,
        i: number,
        fail: MatchFail,
        children: CSTNode[],
        locals: Locals,
        dynamics: Dynamics,
    ): number | null;
    /** Cut depth of the innermost open rule frame (0 if there is none). */
    cutDepth(): number;
    /** Marks the innermost frame's cut as consumed by the current alternative. */
    consumeCut(): void;
    /** How many open frames currently hold a cut. */
    committedDepth(): number;
    /** A snapshot of the cut stack's depths, for speculative parses. */
    snapshotCuts(): readonly number[];
    /** Restores a snapshot taken with {@link OpContext.snapshotCuts}. */
    restoreCuts(saved: readonly number[]): void;
    /** Pushes a fresh cut frame for a rule invocation. */
    pushCutFrame(): void;
    /** Pops the innermost cut frame and returns the depth it reached. */
    popCutFrame(): number;
    /** Records a cut of the given depth in the innermost frame. */
    applyCut(depth: number): void;
    /**
     * True if an enclosing construct has committed (cut) without finishing yet.
     * Resyncs inside such a scope must stay local to it!
     */
    inCommittedScope(): boolean;
}
