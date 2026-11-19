# Types & Enums

## combinator

### `OpMemo`
```ts
Record<string, string[]>
```

### `OpNodeShapes`
The fields of every operation's node, one entry per operation. This is a
separate interface (rather than being inferred from the shape of
opDefs) because Typescript is stupid and can't infer it from the shape
of opDefs.
**Properties:**
- `literal: { pattern: string | readonly [string, string] }`
- `keyword: { tag: string; options: readonly string[] }`
- `opsym: { tag: string; sym: string }`
- `ignored: { child: GrammarCombinator<R, P> }`
- `donate: { child: GrammarCombinator<R, P> }`
- `adopt: { child: GrammarCombinator<R, P> }`
- `rule: { name: R; args: readonly GrammarCombinator<R, P>[] }`
- `param: { name: P; default: GrammarCombinator<R, P> | undefined }`
- `ambient: { name: string; default: GrammarCombinator<R, P> | undefined }`
- `bind: { name: string; value: GrammarCombinator<R, P>; extend: boolean; body: GrammarCombinator<R, P> }`
- `sequence: { items: readonly GrammarCombinator<R, P>[]; separator: GrammarCombinator<R, P> | undefined }`
- `alternatives: { options: readonly GrammarCombinator<R, P>[]; first?: boolean }`
- `optional: { child: GrammarCombinator<R, P> }`
- `repeat: { items: readonly GrammarCombinator<R, P>[]; required: boolean }`
- `joined: { joiner: GrammarCombinator<R, P>; element: GrammarCombinator<R, P>; require2: boolean; trailing: boolean }`
- `if: { condition: GrammarCombinator<R, P>; ifTrue: GrammarCombinator<R, P>; ifFalse: GrammarCombinator<R, P> }`
- `tag: { tag: string; child: GrammarCombinator<R, P> }`
- `cut: { depth: number }`
- `lookahead: { positive: boolean; child: GrammarCombinator<R, P> }`
- `nonempty: { child: GrammarCombinator<R, P> }`
- `sameline: { child: GrammarCombinator<R, P> }`
- `nothing: void`
- `try: { child: GrammarCombinator<R, P> }`
- `die: { message: string }`

### `GrammarOp`
The operation a GrammarCombinator performs; determines which of the
per-operation subtypes a node is, and so which named fields it has.
```ts
keyof OpNodeShapes<any, any>
```

### `CombinatorBase`
Every subtype carries a lazily filled cache of its structural hash (see
hashCombinator).
**Properties:**
- `op: string`

### `GrammarCombinator`
A single grammar node. Combinators are plain serializable data (no
functions), so grammars can be built, inspected, and patched as values. Each
operation has its own subtype with explicitly named fields; the per-operation
definitions (how a node is created, parsed, hashed, and rendered) live
together in the `opDefs` table below.
```ts
{ [O in GrammarOp]: CombinatorBase & { op: O } & OpNodeShapes<R, P>[O] }[GrammarOp] & { ___rules_nonexistent_at_runtime?: R; ___params_nonexistent_at_runtime?: P }
```

### `ParamBinding`
One argument binding of a parameterized rule invocation: the argument
combinator, plus the parameter scope in effect where the argument was
written, so that evaluating it later (via the `param` op) resolves any
parameters it mentions in the call site's scope, not the callee's.
**Properties:**
- `node: GrammarCombinator<any, any>`
- `locals: Locals<any>`

### `ParamFrame`
Internal implementation detail of the parser (used by parameterized
rule and param).

A parameter scope: the bindings of one parameterized rule invocation, chained
to the enclosing scope. Scopes are immutable.
**Properties:**
- `bindings: Readonly<Record<P, ParamBinding>>`
- `next: Locals<any>`

### `Locals`
```ts
ParamFrame<P> | undefined
```

### `DynBindingFrame`
Internal implementation detail of the parser (used by dynamic bind and
ambient).

The dynamic scope: a chain of dynamic bindings (bound value, scopes in which
it was created), innermost first. Like the ParamFrame it immutable.
**Properties:**
- `name: string`
- `node: GrammarCombinator<any, any>`
- `locals: Locals<any>`
- `next: Dynamics`
- `key: string` — Unique string form of this chain (each binding's name plus the resolved
serialization of its value), mixed into memo keys to keep cache entries
specific to this exact scope's bindings.

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
- `call: (ctx: OpContext<any>, node: N, path: string, i: number, locals: Locals<any>, dynamics: Dynamics) => CSTNode<any> | MatchFail`
- `hashFields: readonly (readonly [keyof N, MixAction])[]`
- `describe: (node: N) => string`

### `OpDefs`
The (weak) type of opDefs: every operation's definition, tied to its
declared node shape in OpNodeShapes.
```ts
{ [O in GrammarOp]: GrammarOpDef<OpNodeShapes<any, any>[O]> }
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
- `memo: Memo<R>`
- `grammar: Grammar<R>`

## grammar

### `GrammarEntry`
One rule of a Grammar: the rule's definition, plus -- for a
parameterized rule -- its parameter names (see ParameterizedRule). Any
further fields are metadata, typed by the grammar's metadata type parameter
`M`: Nebula itself never reads them; they are how a consumer keeps per-rule
data, such as a compile handler, next to the rule it belongs to.
```ts
(NonParameterizedRule<R> | ParameterizedRule<R, any>) & M
```

### `Grammar`
A grammar: rule names mapped to their entries.
```ts
Readonly<Record<R, GrammarEntry<R, M>>>
```

### `NonParameterizedRule`
```ts
{ def: GrammarCombinator<R, never>; params?: undefined } & M
```

### `ParameterizedRule`
Inside the body, param evaluates the combinator that was passed for
that parameter at the call site (in the call site's scope).

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
{ [x in MemoLoc]: CSTNode<T> | MatchFail | LR<T> } & { __operators?: OpMemo; __donors?: WeakSet<CSTNode<T>> }
```

## walk

### `CombinatorWalker`

### `CSTPath`
One node of a traverseCST walk, with the means to steer it.
**Properties:**
- `node: CSTNode<T>` — The node being visited.
- `parent: CSTNode<T> | null` — The node's parent, or null when visiting the root.
- `index: number` — The node's index within its parent's children (-1 for the root).

### `CSTVisitor`
A traverseCST visitor: either one function called for every node, or
a table from node type to the function for nodes of that type, with a `"*"`
entry (if any) called for the nodes no other entry claims -- text leaves and
unnamed containers can only be reached through `"*"`. The functions run
pre-order: a node is visited before its children.
```ts
((path: CSTPath<T>) => void) | Readonly<Record<string, (path: CSTPath<T>) => void>>
```

## compile

### `CompilerTable`
Hooks matching the rule name to handler type. T is defined by the specific
compile driver that you use (for syncCompile, it is a Javascript
function).

The mapping is used by the handler for any purpose, but is usually used to
map variant to implementation (e.g "+" to a plus builtin and "-" to a minus
builtin.)
```ts
Record<R, [fn: T, mapping?: Record<string, any>]>
```

### `CompileBuilder`
Result from a single compile step.
**Properties:**
- `val: T` — The template value of AST.
- `tbc: [CSTNode<R>, PropertyKey[]][]` (optional) — For all the value-path pairs in `tbc`, the CST node will be compiled, and
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
