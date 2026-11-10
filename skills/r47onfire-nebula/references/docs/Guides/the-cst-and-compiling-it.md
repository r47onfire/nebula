# The CST and compiling it

## The CST

A parse produces a concrete syntax tree of `CSTNode`s. The defining
invariant: concatenating the `text` of all leaves -- _including_ ignored
nodes -- reproduces the original source exactly. Nothing is thrown away at
parse time; deciding what is junk is a separate, later step.

A node may carry:

- `type` -- the rule name, for named nodes. Unnamed container nodes and
  text leaves have no `type`.
- `start` / `end` -- source offsets (indices, not line/column).
- `text` -- the matched text, on leaves.
- `children` -- child nodes.
- `ignored` -- set on nodes matched under `ignored(...)`.
- `errorExpected` -- set on error nodes: the combinator that would have
  matched at that position.

## Condensing

```ts
// All imports in this page come from here (not the root entrypoint)
import { condenseCST, walkCombinator } from "@r47onfire/nebula/compile";
```

`condenseCST(cst)` lowers a CST towards an AST while preserving spans:

- ignored children are removed;
- unnamed container nodes are merged into their parent;
- named nodes, text leaves, and error nodes stay as they are (error nodes stay whole, their children unexamined).

## Compiling a condensed tree

Nebula does not prescribe a target language. It provides one generic walk for turning a condensed tree into output values: `syncCompile(node, table, wrap, handleError)`, driven by a `CompilerTable` that maps each node `type` to a handler.

A handler receives the node's children, an optional per-variant mapping record, and the node itself, and returns a `CompileBuilder`: a template value `val`, a list `tbc` of (child node, path) pairs naming which children still need compiling and where their results belong in the template, and an optional `post` naming another table entry to re-dispatch the assembled value through. Compile errors do not throw out of the walk: they are routed to `handleError`, which typically swallows the error and produces an error value in the output -- so an error in unreachable output stays inert unless evaluation reaches it.

## Walking grammars themselves

`walkCombinator` folds over a grammar combinator with a `CombinatorWalker` (a leaf hook for scalar fields and a fold hook per node), and resolves rule references and parameters against an environment. `hashCombinator` and `hashResolved` are that same walk specialized to hashing: hashing a grammar (or a rule with its parameters resolved) gives memoization and change detection a stable key to work with.