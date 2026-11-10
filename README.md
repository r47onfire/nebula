# Nebula

A grammar-driven packrat parser engine with left-recursion support. Grammars are plain JSON -- no code generation, no separate grammar file format -- and parsing produces a concrete syntax tree (CST) whose leaves, concatenated, reproduce the input exactly.

The parsing algorithm is a modified PEG packrat parser that supports left recursion, based on "Packrat Parsers Can Support Left Recursion" by Warth, Douglass, and Millstein (PEPM '08). A copy of the paper is bundled at `src/parser/packrat_lr.pdf`.

Nebula is primarily designed to be used in [Backolon](https://backolon.js.org), but it is a general-purpose parsing library and knows nothing about any particular language.

- API documentation and guides: <https://r47onfire.github.io/nebula>

## Install

```sh
bun add github:@r47onfire/nebula
# or
npm install github:@r47onfire/nebula
```

## Example

```ts
import {
    Grammar,
    lit,
    param,
    parseToCST,
    regex,
    rule,
    seq,
} from "@r47onfire/nebula";

const grammar: Grammar = {
    main: rule("wrap", lit("("), lit(")")),
    // a parameterized rule: `wrap` is called with two combinator arguments
    wrap: [["open", "close"], seq(param("open"), rule("word"), param("close"))],
    word: regex(/[a-z]+/),
};

const cst = parseToCST(
    "(abc)",
    new URL("filename"),
    0,
    "main",
    grammar,
    "exprs",
);
```

`parseToCST` never throws for bad input: syntax errors come back as error nodes in the CST (with an `errorExpected` field pointing to the grammar rule or combinator that should have matched), so a caller can report every error it can recover from, not just the first.

## Repository layout

- Source files go in `src/`
- Test files go in `test/`
- Build scripts and helpers go in `scripts/`
- Prose documentation guides go in `guides/`
- Build artifacts go in `dist/` - gitignore'd
- Website build files go in `docs/` - gitignore'd

## Development

```sh
bun run build   # bundle src/index.ts into dist/
bun test        # run the test suite
bun run dev     # serve docs/ on http://localhost:8000 and rebuild on change
```

## License

AGPL-3.0-only
