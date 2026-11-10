# Functions

## combinator

### `describeCombinator`
Renders a combinator in a compact PEG-like notation, via its operation's
`describe` in opDefs; for debugging grammars.
```ts
describeCombinator(node: GrammarCombinator): string
```
**Parameters:**
- `node: GrammarCombinator`
**Returns:** `string`

## combinatorFactory

### `lit`
Matches the literal string `p` exactly; produces a leaf holding that text.
```ts
lit(str: string): GrammarCombinator
```
**Parameters:**
- `str: string`
**Returns:** `GrammarCombinator`

### `regex`
Matches the regex `p` anchored at the current position (the engine adds the
sticky flag); produces a leaf holding the matched text. The pattern is stored
as `[source, flags]` to keep combinators plain data.
```ts
regex(pattern: RegExp): GrammarCombinator
```
**Parameters:**
- `pattern: RegExp`
**Returns:** `GrammarCombinator`

### `seq`
Matches all of `n` in order; the result is a flat node holding every child's
result.
```ts
seq(nodes: GrammarCombinator[]): GrammarCombinator
```
**Parameters:**
- `nodes: GrammarCombinator[]`
**Returns:** `GrammarCombinator`

### `ssep`
Like `seq`, but the separator `s` is attempted between the items; separator
results are marked ignored.
```ts
ssep(separator: GrammarCombinator, nodes: GrammarCombinator[]): GrammarCombinator
```
**Parameters:**
- `separator: GrammarCombinator`
- `nodes: GrammarCombinator[]`
**Returns:** `GrammarCombinator`

### `alt`
Tries every alternative and returns the first alternative that cut (whether
or not it succeeded) or if none cut, the longest succeeding match (the first,
on ties).
```ts
alt(options: GrammarCombinator[]): GrammarCombinator
```
**Parameters:**
- `options: GrammarCombinator[]`
**Returns:** `GrammarCombinator`

### `no`
Always fails, but not a hard failure.
```ts
no(): GrammarCombinator
```
**Returns:** `GrammarCombinator`

### `altFirst`
Ordered choice: returns the first succeeding alternative, without trying
later ones (a later alternative is tried only if every earlier one fails
without cutting).
```ts
altFirst(options: GrammarCombinator[]): GrammarCombinator
```
**Parameters:**
- `options: GrammarCombinator[]`
**Returns:** `GrammarCombinator`

## errors

### `formatTrace`
Formats `message` as `file:line:col: message`, followed by the source line
containing `span.begin` and a row of `^` under the span `begin..end` (clipped
to that line, with a "..." suffix if the span runs past it).

`getSource` supplies the text of a source file by URL; if it returns an empty
string, only the header line is produced.
```ts
formatTrace(span: Span, message: string, getSource: (url: URL) => string): string
```
**Parameters:**
- `span: Span`
- `message: string`
- `getSource: (url: URL) => string`
**Returns:** `string`

## parseToCST

### `parseToCST`
Parse text into a CST. The CST may contain error nodes if there were syntax
errors.
```ts
parseToCST(text: string, filename: Readonly<URL>, startIndex: number, startRule: string, grammar: Grammar, recoverNodeType: string, errorType: string, memo: Memo): CSTNode
```
**Parameters:**
- `text: string`
- `filename: Readonly<URL>`
- `startIndex: number`
- `startRule: string`
- `grammar: Grammar`
- `recoverNodeType: string`
- `errorType: string` — default: `"BAD"`
- `memo: Memo` — default: `{}`
**Returns:** `CSTNode`

## walk

### `walkCombinator`
```ts
walkCombinator<T, E>(g: GrammarCombinator, env: E, walker: CombinatorWalker<T, E>): T
```
**Parameters:**
- `g: GrammarCombinator`
- `env: E`
- `walker: CombinatorWalker<T, E>`
**Returns:** `T`

### `hashCombinator`
A hash of a combinator tree, driven by the `hashFields` of each operation's
definition: like trees hash alike. Since there is no resolver, this is a
purely structural hash and is cached on the node itself, so hashing a tree
costs one walk, ever.
```ts
hashCombinator(g: GrammarCombinator): number
```
**Parameters:**
- `g: GrammarCombinator`
**Returns:** `number`

### `hashResolved`
A hash of a combinator tree with its parameter references resolved: `param`
nodes contribute the hash of the argument they name (resolved in the lexical
scope), `ambient` nodes the hash of the dynamic binding they name (resolved
in the dynamic scope captured by that binding, so a binding's value never
depends on itself), and `bind` nodes hash their body under the dynamic scope
the bind creates. Nothing is cached, since the result depends on the scopes,
not just the tree.
```ts
hashResolved(g: GrammarCombinator, locals: Locals, dynamics: Dynamics, path: string): number
```
**Parameters:**
- `g: GrammarCombinator`
- `locals: Locals`
- `dynamics: Dynamics`
- `path: string`
**Returns:** `number`
**Throws:** If the grammar is invalid (there is a lexical or ambient parameter
  that isn't bound and has no default)

## compile

### `condenseCST`
Condense a CST as much as possible, preserving metadata spans:

- Ignored children are removed
- Unnamed container nodes are merged into their parent
- Named nodes, text leaves, and error nodes stay as they are

The root is always a named node since a parse always starts at a named rule.
```ts
condenseCST(cst: CSTNode): CSTNode
```
**Parameters:**
- `cst: CSTNode`
**Returns:** `CSTNode`

### `syncCompile`
```ts
syncCompile<T>(node: CSTNode, tab: CompilerTable<(items: any, table: Record<string, any> | undefined, node: CSTNode) => CompileBuilder<T>>, wrap: (compiled: any, node: CSTNode) => any, handleError: (message: any) => any): any
```
**Parameters:**
- `node: CSTNode`
- `tab: CompilerTable<(items: any, table: Record<string, any> | undefined, node: CSTNode) => CompileBuilder<T>>`
- `wrap: (compiled: any, node: CSTNode) => any`
- `handleError: (message: any) => any`
**Returns:** `any`

### `assignPath`
Set `obj` into `val` at the location named by `path`, possibly mutating `val`
in place, and return the new `val`.

Every element of `path` but the last indexes into an existing value; the last
names the property that is assigned. Nothing is created along the way, so the
intermediate containers must already exist. An empty path assigns nothing and
simply returns `obj` in place of the whole value.

This is the write half of CompileBuilder.tbc: each entry pairs a child
node with the path its compiled value belongs at in the handler's template.
```ts
assignPath<T, P>(val: T, obj: PathValue<T, P>, path: P & ValidPath<T, P>): T
```
**Parameters:**
- `val: T`
- `obj: PathValue<T, P>`
- `path: P & ValidPath<T, P>`
**Returns:** `T`
