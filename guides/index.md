---
title: Nebula
category: Guides
children:
    - ./getting-started.md
    - ./combinators.md
    - ./cst-and-compiling.md
---

# Nebula guides

Nebula is a parser engine: you describe a grammar as plain JSON data
built from combinators, and Nebula parses text into a concrete syntax tree
(CST). There is no grammar file format and no code generation step -- a
grammar is just a value, so it can be assembled, extended, and inspected at
runtime like any other data.

- [Getting started](./getting-started.md) -- install Nebula, write a first
  grammar, and parse something with it.
- [Combinators](./combinators.md) -- every combinator Nebula provides,
  grouped by what it does.
- [The CST and compiling it](./cst-and-compiling.md) -- what a parse produces,
  how to condense a CST into an AST-shaped tree, how errors are represented,
  and the generic tree walks Nebula provides for building compilers on top.
