# Classes

## cst

### `CSTNode`
A node of the concrete syntax tree produced by the parser.

Invariant: recursively concatenating the `text` of all leaves -- including
`ignored` nodes -- reproduces the original source exactly. Ignored nodes are
only removed in a later pass, when the CST is lowered to an AST.
```ts
constructor<T>(span: Span, type: T | null, children: readonly CSTNode<T>[], ignored: boolean, tag: string | null, text: string | null, errorExpected?: GrammarCombinator<any, any>): CSTNode<T>
```
**Properties:**
- `span: Span` — The location identifying where this node came from.
- `type: T | null` — Functional type (usually rule name) for AST generation or direct
execution.
- `children: readonly CSTNode<T>[]` — Not present in non-leaf nodes.
- `ignored: boolean` — True if this node is meaningless junk that does not change the AST
(commas, parens, whitespace/comments) and can be dropped in a
pre-processing step.
- `tag: string | null` — Visual kind for syntax highlighting.
- `text: string | null` — Text of this node; empty if a non-leaf.
- `errorExpected: GrammarCombinator<any, any>` (optional) — If set, it means this node is a fallback recovery node that should be
translated into a lazy syntax error.

## parseToCST

### `MatchFail`
A failed match. This doesn't actually show up in a failed parse, it is only
used internally by the parsing machinery. If you manage to get an instance of
this out of the parsing machinery, report it as a bug!
```ts
constructor(i: number, cut: number, expected: GrammarCombinator<any, any>): MatchFail
```
**Properties:**
- `i: number` — Index where the failure occurred (used for error reporting)
- `cut: number` — Remaining cut depth (Infinity for die)
- `expected: GrammarCombinator<any, any>` — The combinator that failed to match.

## span

### `Span`
Source location information for a token. Also immutable at runtime.
```ts
constructor(file: Readonly<URL>, begin: number, end: number, startLine: number, startCol: number, endLine: number, endCol: number): Span
```
**Properties:**
- `file: Readonly<URL>` — URL uniquely identifying the source that this span is from.
- `begin: number` — Source index at which this span starts. (not line or column.)
- `end: number` — Source index at which this span ends.
- `startLine: number`
- `startCol: number`
- `endLine: number`
- `endCol: number`
