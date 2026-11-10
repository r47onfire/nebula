# Types & Enums

## combinator

### `OpNodeShapes`
The fields of every operation's node, one entry per operation. This is a
separate interface (rather than being inferred from the shape of
opDefs) because Typescript is stupid and can't infer it from the shape
of opDefs.
**Properties:**
- `literal: { pattern: string | [string, string] }`
- `keyword: { tag: string; options: string[] }`
- `opsym: { tag: string; sym: string }`
- `ignored: { child: GrammarCombinator }`
- `rule: { name: string; args: GrammarCombinator[] }`
- `param: { name: string; default: GrammarCombinator | undefined }`
- `ambient: { name: string; default: GrammarCombinator | undefined }`
- `bind: { name: string; value: GrammarCombinator; extend: boolean; body: GrammarCombinator }`
- `sequence: { items: GrammarCombinator[]; separator: GrammarCombinator | undefined }`
- `alternatives: { options: GrammarCombinator[]; first?: boolean }`
- `optional: { child: GrammarCombinator }`
- `repeat: { items: GrammarCombinator[]; required: boolean }`
- `joined: { joiner: GrammarCombinator; element: GrammarCombinator; require2: boolean; trailing: boolean }`
- `if: { condition: GrammarCombinator; ifTrue: GrammarCombinator; ifFalse: GrammarCombinator }`
- `tag: { tag: string; child: GrammarCombinator }`
- `cut: { depth: number }`
- `lookahead: { positive: boolean; child: GrammarCombinator }`
- `nonempty: { child: GrammarCombinator }`
- `sameline: { child: GrammarCombinator }`
- `nothing: void`
- `try: { child: GrammarCombinator }`
- `die: { message: string }`

### `GrammarOp`
The operation a GrammarCombinator performs; determines which of the
per-operation subtypes a node is, and so which named fields it has.
```ts
keyof OpNodeShapes
```

### `CombinatorBase`
Every subtype carries a lazily filled cache of its structural hash (see
hashCombinator).
**Properties:**
- `hash: number` (optional) — Cached structural hash; filled in by hashCombinator
- `op: string`

### `GrammarCombinator`
A single grammar node. Combinators are plain serializable data (no
functions), so grammars can be built, inspected, and patched as values. Each
operation has its own subtype with explicitly named fields; the per-operation
definitions (how a node is created, parsed, hashed, and rendered) live
together in the `opDefs` table below.
```ts
{ [O in GrammarOp]: CombinatorBase & { op: O } & OpNodeShapes[O] }[GrammarOp]
```

### `ParamBinding`
One argument binding of a parameterized rule invocation: the argument
combinator, plus the parameter scope in effect where the argument was
written, so that evaluating it later (via the `param` op) resolves any
parameters it mentions in the call site's scope, not the callee's.
**Properties:**
- `node: GrammarCombinator`
- `locals: Locals`

### `ParamFrame`
A parameter scope: the bindings of one parameterized rule invocation, chained
to the enclosing scope. Scopes are threaded through the parse as immutable
values, so speculative branches (alternatives, lookaheads, recovery probes)
can never disturb each other's bindings.
**Properties:**
- `bindings: Readonly<Record<string, ParamBinding>>`
- `next: Locals`

### `Locals`
```ts
ParamFrame | undefined
```

### `DynBindingFrame`
The dynamic scope: a chain of dynamic bindings (bound value, scopes in which
it was created), innermost first. Like the lexical scope it is threaded
through the parse as an immutable value, so speculative branches cannot
disturb each other's bindings. `key` identifies this exact chain; while a
chain is in effect its key is part of every memo identity, so a result that
depends on ambient context is never reused under a different context.
**Properties:**
- `name: string`
- `node: GrammarCombinator`
- `locals: Locals`
- `dynamics: Dynamics`
- `next: Dynamics`
- `key: string`

### `Dynamics`
```ts
DynBindingFrame | undefined
```

### `GrammarOpDef`
The definition of one grammar operation: how its nodes are created (`create`,
also exported as the operation's factory function), how they are parsed
(`call`), which of their fields feed the combinator hash (`hashFields`), and
how they are rendered for debugging (`describe`). Keeping all four together
in this table is what lets the parser's dispatcher, the hash function, and
the debug renderer stay generic over operations. This is the loose common
shape of a definition; each entry in opDefs is more precise (its
`call` and `describe` are typed against the exact node shape its own `create`
returns).
**Properties:**
- `create: (args: any[]) => N`
- `call: (ctx: OpContext, node: N, path: string, i: number, locals: Locals, dynamics: Dynamics) => CSTNode | MatchFail`
- `hashFields: readonly (readonly [keyof N, MixAction])[]`
- `describe: (node: N) => string`

### `OpDefs`
The (weak) type of opDefs: every operation's definition, tied to its
declared node shape in OpNodeShapes.
```ts
{ [O in GrammarOp]: GrammarOpDef<OpNodeShapes[O]> }
```

### `MixAction`
How one field of a combinator is mixed into its hash (see `hashFields` on
GrammarOpDef).
- `String` = `0` — A string
- `Tag` = `1` — Same as String but semantically a tag
- `Number` = `2`
- `Boolean` = `3`
- `Text` = `4` — A string or an array of strings (essentially the union of String
plus StringArray)
- `StringArray` = `5` — An array of strings
- `Child` = `6` — A single sub-combinator, handled recursively
- `ScopedChild` = `7` — A single sub-combinator, handled recursively, which changes the scope
available to its children
- `Children` = `8` — An array of sub-combinators, each handled recursively
- `AuxChild` = `9` — A single sub-combinator in the auxiliary role (separator, joiner,
condition), that should be hashed with a different constant so it cannot
be confused with a sequential child

## context

### `OpContext`
The services an operation's `call` needs from the parser: the input, the
grammar, the memoizing entry point for sub-parses, error recovery, and the
cut bookkeeping. Provided by `parseToCST`; see there for what each one does.
**Properties:**
- `text: string`
- `memo: Memo`
- `grammar: Grammar`

## cst

### `CSTNode`
A node of the concrete syntax tree produced by the parser.

Invariant: recursively concatenating the `text` of all leaves -- including
`ignored` nodes -- reproduces the original source exactly. Ignored nodes are
only removed in a later pass, when the CST is lowered to an AST.

## grammar

### `Grammar`
A grammar: rule names mapped to their definitions.
```ts
Readonly<Record<string, GrammarCombinator | ParameterizedRule>>
```

### `ParameterizedRule`
A parameterized rule definition: the parameter names, and the rule body.
Inside the body, `param(name)` evaluates the combinator that was passed for
that parameter at the call site (in the call site's scope).
```ts
readonly [params: readonly string[], body: GrammarCombinator]
```

## parseToCST

### `MemoLoc`
Memoization key: `&lt;start index&gt;#&lt;grammar path&gt;`. The path of a nested
combinator is built from rule names plus `/`-separated child indices, so the
same combinator reached through different rules memoizes separately.
```ts
`${number}#${string}`
```

### `Memo`
The memo table for a parse: results (a CST node, a failure, or an in-progress
LR) by `MemoLoc`. A caller may pass one in to reuse it across parses, but it
must be cleared whenever the grammar changes.
```ts
Record<MemoLoc, CSTNode | MatchFail | LR>
```

## walk

### `CombinatorWalker`
**Properties:**
- `precomputed: (node: GrammarCombinator, env: E) => T | undefined` (optional) — A finished value for this node, if already known: cancels the walk below
it.
- `memoize: (node: GrammarCombinator, value: T, env: E) => void` (optional) — Record a node's folded value for future `precomputed` hits.

## compile

### `CompilerTable`
Hooks matching the rule name to handler type. T is defined by the specific
compile driver that you use (for syncCompile, it is a Javascript
function).

The mapping is used by the handler for any purpose, but is usually used to
map variant to implementation (e.g "+" to a plus builtin and "-" to a minus
builtin.)
```ts
Record<string, [fn: T, mapping?: Record<string, any>]>
```

### `CompileBuilder`
Result from a single compile step.
**Properties:**
- `val: T` — The template value of AST.
- `tbc: [CSTNode, PropertyKey[]][]` (optional) — For all the value-path pairs in `tbc`, the CST node will be compiled, and
then inserted into the `val` using assignPath.
- `post: string | null` (optional) — If `post` is set then the result, after assembling, will be passed back
into the `post` entry in the table (as a single node).

### `PathValue`
The type of the value found at the end of path `P` in `T`. An empty path
gives `T` itself. A path that is not a fixed-length tuple cannot be resolved
statically and gives `any`.
```ts
number extends P["length"] ? any : P extends readonly [infer H, ...(infer R extends PropertyKey[])] ? H extends keyof T ? PathValue<T[H], R> : never : T
```

### `ValidPath`
`P` itself if every element of `P` is a key of the value the previous
elements lead to in `T`; `never` as soon as one step is not. An empty path is
valid. A path that is not a fixed-length tuple cannot be checked statically
and passes through unchanged.
```ts
number extends P["length"] ? P : P extends readonly [infer H, ...(infer R extends PropertyKey[])] ? H extends keyof T ? readonly [H, ...ValidPath<T[H], R>] : never : readonly []
```
