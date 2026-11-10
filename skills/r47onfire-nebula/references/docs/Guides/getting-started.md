# Getting started

## Install

```sh
bun add github:@r47onfire/nebula
# or
npm install github:@r47onfire/nebula
```

## A first grammar

A grammar is a plain object mapping rule names to combinators. Combinators are also plain data -- every constructor below just builds a node of the grammar:

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
    wrap: [["open", "close"], seq(param("open"), rule("word"), param("close"))],
    word: regex(/[a-z]+/),
};
```

Two things to notice:

- `nebula!rule | `rule("word")`` refers to another rule by name. A rule that succeeds produces a CST node whose `nebula!CSTNode.type | `type`` is the rule name.
- `wrap` is a _parameterized rule_: its definition is a pair of a parameter list and a body. `nebula!rule | `rule("wrap", lit("("), lit(")"))`` calls it with two combinator arguments, and inside the body `nebula!param | `param("open")`` and `nebula!param | `param("close")`` stand for them. Different call sites can pass different arguments and get different parses from the same rule body.

## Parsing

```ts
const cst = parseToCST("(abc)", new URL("test"), 0, "main", grammar, "exprs");
```

The arguments are the text, the filename (as a `URL`), the index to start at, the start rule, the grammar, and the node type to wrap recovered text in when the parse has to skip over input it cannot match. An optional seventh argument names the error node type (default `"BAD"`), and an optional eighth passes in a memo table to reuse across parses of an unchanged grammar.

## Reading the result

The result is a `nebula!CSTNode | `CSTNode``. Named nodes have a `nebula!CSTNode.type | `type``, every node knows its `start`/`end` offsets and the `nebula!CSTNode.text | `text`` it matched, and concatenating the `nebula!CSTNode.text | `text`` of all the leaves -- including ignored ones -- reproduces the input exactly.

Parsing does not throw on bad input. A position where nothing matched becomes an error node whose `nebula!CSTNode.errorExpected | `errorExpected`` field holds the combinator that should have matched there, which is also how a caller can render "expected X" messages. See [The CST and compiling it](./cst-and-compiling.md) for condensing a CST and formatting errors.