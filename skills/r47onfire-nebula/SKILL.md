---
description: "Packrat parser engine with left-recursion support, producing a round-trippable CST. Also: parser, packrat, peg, grammar, left-recursion, cst."
license: AGPL-3.0-only
name: r47onfire-nebula
---

# @r47onfire/nebula

Packrat parser engine with left-recursion support, producing a round-trippable CST.

## Quick Reference

62 exports (16 functions, 2 classes, 22 types, 1 enums, 21 constants) — see references/ for full API.

## Documentation

- **Nebula** — # Nebula guides

Nebula is a parser engine: you describe a grammar as plain JSON data
built from combinators, and Nebula parses text into a concrete syntax tree
(CST).
- **Getting started** — # Getting started

## Install

```sh
bun add github:@r47onfire/nebula
# or
npm install github:@r47onfire/nebula
```

## A first grammar

A grammar is a plain object mapping rule names to combinators.
- **Combinators** — # Combinators

Every combinator is a function that returns an immutable grammar node.
- **The CST and compiling it** — # The CST and compiling it

## The CST

A parse produces a concrete syntax tree of `nebula!

See `references/docs/` for full guides (4 total).

## References

Load these on demand — do NOT read all at once:

- When calling any function → read `references/functions.md` for full signatures, parameters, and return types
- When using a class → read `references/classes.md` for properties, methods, and inheritance
- When defining typed variables or function parameters → read `references/types.md`
- When using exported constants → read `references/variables.md`
- When learning concepts or workflows → browse `references/docs/` by category

## Links

- [Repository](https://github.com/r47onfire/nebula)
- Author: dragoncoder047