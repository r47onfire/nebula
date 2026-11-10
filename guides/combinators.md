---
title: Combinators
category: Guides
---

# Combinators

Every combinator is a function that returns an immutable grammar node. Grammars compose by nesting them.

## Terminals

- {@link nebula!lit | `lit(s)`} -- match the literal string `s`.
- {@link nebula!regex | `regex(p)`} -- match the regular expression `p` at the current position.
- {@link nebula!kw | `kw(s)`} -- match the keyword `s`, requiring a word boundary on both sides so a longer identifier starting with `s` does not match.
- {@link nebula!op | `op(s)`} -- match the operator symbol `s`. Operator symbols guard against their own extensions: Nebula computes prefix guards from every {@link nebula!op | `op`} in the grammar, so `+` never matches the front of `++` or `+=`.

## Structure

- {@link nebula!seq | `seq(...)`} -- match all of the children in order.
- {@link nebula!ssep | `ssep(sep, ...)`} -- match the children in order with `sep` between each pair (and only between them).
- {@link nebula!alt | `alt(...)`} -- try each alternative and keep the _longest_ match.
- {@link nebula!altFirst | `altFirst(...)`} -- try each alternative and keep the _first_ that matches, PEG-style.
- {@link nebula!opt | `opt(c)`} -- match `c` if possible, succeed either way.
- {@link nebula!rep | `rep(c)`} -- match `c` zero or more times.
- {@link nebula!joined | `joined(c, sep)`} -- match `c` zero or more times with `sep` between repetitions.
- {@link nebula!rule | `rule(name, ...args)`} -- invoke the named rule, optionally passing combinator arguments to a parameterized rule.
- {@link nebula!param | `param(name)`} -- stand for the argument bound to the parameter `name` of the enclosing parameterized rule.

## Scoping

Grammars can carry values alongside the parse:

- {@link nebula!bind | `bind(...)`} -- introduce dynamically-scoped bindings (from the combinators it wraps) that rules invoked inside can see.
- {@link nebula!ambient | `ambient(name)`} -- read a value established by an enclosing {@link nebula!bind | `bind`}.
- {@link nebula!if_ | `if_(...)`} -- match conditionally on a success result.

## Controlling the match

- {@link nebula!cut | `cut(c)`} -- commit: once `c` has matched, a failure later in the rule does not backtrack past the cut. Cuts are what let error recovery report the real error position instead of retrying the whole rule elsewhere.
- {@link nebula!lookahead | `lookahead(c)`} -- succeed if `c` would match here, without consuming it.
- {@link nebula!nonempty | `nonempty(c)`} -- match `c`, but fail if it matched the empty string.
- {@link nebula!sameline | `sameline(c)`} -- match `c`, but fail if it crosses a line boundary.
- {@link nebula!try_ | `try_(c)`} -- attempt `c`; on failure, roll back as if it was never tried, suppressing inner cuts.
- {@link nebula!die | `die()`} -- loudly fail (discards the whole parse), even inside alternatives.
- {@link nebula!no | `no()`} -- an empty alternative: always fails. ({@link nebula!alt | `alt()`} with no arguments
  that could match.)
- {@link nebula!nothing | `nothing()`} (or {@link nebula!yes | `yes()`}) -- always succeeds, matching the empty string.

## Annotation

- {@link nebula!ignored | `ignored(c)`} -- mark what `c` matches as ignorable (whitespace, comments, punctuation). Ignored children stay in the CST so the source can be reproduced exactly, and are removed by {@link compile!condenseCST | `condenseCST`}.
- {@link nebula!tag | `tag(c, name)`} -- attach a semantic tag to the node `c` produces, for syntax highlighters and other tree consumers that read the uncondensed tree.
