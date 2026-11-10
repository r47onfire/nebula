---
title: Combinators
category: Guides
---

# Combinators

Every combinator is a function that returns an immutable grammar node. Grammars compose by nesting them.

## Terminals

- `lit(s)` -- match the literal string `s`.
- `regex(p)` -- match the regular expression `p` at the current position.
- `kw(s)` -- match the keyword `s`, requiring a word boundary on both sides so a longer identifier starting with `s` does not match.
- `op(s)` -- match the operator symbol `s`. Operator symbols guard against their own extensions: Nebula computes prefix guards from every `op` in the grammar, so `+` never matches the front of `++` or `+=`.

## Structure

- `seq(...)` -- match all of the children in order.
- `ssep(sep, ...)` -- match the children in order with `sep` between each pair (and only between them).
- `alt(...)` -- try each alternative and keep the _longest_ match.
- `altFirst(...)` -- try each alternative and keep the _first_ that matches, PEG-style.
- `opt(c)` -- match `c` if possible, succeed either way.
- `rep(c)` -- match `c` zero or more times.
- `joined(c, sep)` -- match `c` zero or more times with `sep` between repetitions.
- `rule(name, ...args)` -- invoke the named rule, optionally passing combinator arguments to a parameterized rule.
- `param(name)` -- stand for the argument bound to the parameter `name` of the enclosing parameterized rule.

## Scoping

Grammars can carry values alongside the parse:

- `bind(...)` -- introduce dynamically-scoped bindings (from the combinators it wraps) that rules invoked inside can see.
- `ambient(name)` -- read a value established by an enclosing `bind`.
- `if_(...)` -- match conditionally on a success result.

## Controlling the match

- `cut(c)` -- commit: once `c` has matched, a failure later in the rule does not backtrack past the cut. Cuts are what let error recovery report the real error position instead of retrying the whole rule elsewhere.
- `lookahead(c)` -- succeed if `c` would match here, without consuming it.
- `nonempty(c)` -- match `c`, but fail if it matched the empty string.
- `sameline(c)` -- match `c`, but fail if it crosses a line boundary.
- `try_(c)` -- attempt `c`; on failure, roll back as if it was never tried, suppressing inner cuts.
- `die()` -- loudly fail (discards the whole parse), even inside alternatives.
- `no()` -- an empty alternative: always fails. (`alt()` with no arguments
  that could match.)
- `nothing()` (or `yes()`) -- always succeeds, matching the empty string.

## Annotation

- `ignored(c)` -- mark what `c` matches as ignorable (whitespace, comments, punctuation). Ignored children stay in the CST so the source can be reproduced exactly, and are removed by `condenseCST`.
- `tag(c, name)` -- attach a semantic tag to the node `c` produces, for syntax highlighters and other tree consumers that read the uncondensed tree.
