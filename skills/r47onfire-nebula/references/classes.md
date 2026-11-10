# Classes

## parseToCST

### `MatchFail`
A failed match. This doesn't actually show up in a failed parse, it is only
used internally by the parsing machinery. If you manage to get an instance of
this out of the parsing machinery, report it as a bug!
```ts
constructor(i: number, cut: number, expected: GrammarCombinator): MatchFail
```
**Properties:**
- `i: number` — Index where the failure occurred (used for error reporting)
- `cut: number` — Remaining cut depth (Infinity for die)
- `expected: GrammarCombinator` — The combinator that failed to match.

## span

### `Span`
Source location information for a token.
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
