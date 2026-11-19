# Functions

## combinator

### `describeCombinator`
Renders a combinator in a compact PEG-like notation, via its operation's
`describe` in opDefs; for debugging grammars.
```ts
describeCombinator(node: GrammarCombinator<any, any>): string
```
**Parameters:**
- `node: GrammarCombinator<any, any>`
**Returns:** `string`

## combinatorFactory

### `seq`
Matches all of `nodes` in order; the result is a flat node holding every
child's result.
```ts
seq<R, P>(nodes: GrammarCombinator<R, P>[]): GrammarCombinator<NoInfer<R>, NoInfer<P>>
```
**Parameters:**
- `nodes: GrammarCombinator<R, P>[]`
**Returns:** `GrammarCombinator<NoInfer<R>, NoInfer<P>>`

### `ssep`
Like seq, but the separator is attempted between the items; separator
results are marked CSTNode.ignored | ignored.
```ts
ssep<R, P>(separator: GrammarCombinator<R, P>, nodes: GrammarCombinator<R, P>[]): GrammarCombinator<NoInfer<R>, NoInfer<P>>
```
**Parameters:**
- `separator: GrammarCombinator<R, P>`
- `nodes: GrammarCombinator<R, P>[]`
**Returns:** `GrammarCombinator<NoInfer<R>, NoInfer<P>>`

### `alt`
Tries every alternative and returns the first alternative that cut
(whether or not it succeeded) or if none cut, the longest succeeding match
(the first, on ties).
```ts
alt<R, P>(options: GrammarCombinator<R, P>[]): GrammarCombinator<NoInfer<R>, NoInfer<P>>
```
**Parameters:**
- `options: GrammarCombinator<R, P>[]`
**Returns:** `GrammarCombinator<NoInfer<R>, NoInfer<P>>`

### `altFirst`
Ordered choice: returns the first succeeding alternative, without trying
later ones (a later alternative is tried only if every earlier one fails
without cutting).
```ts
altFirst<R, P>(options: GrammarCombinator<R, P>[]): GrammarCombinator<NoInfer<R>, NoInfer<P>>
```
**Parameters:**
- `options: GrammarCombinator<R, P>[]`
**Returns:** `GrammarCombinator<NoInfer<R>, NoInfer<P>>`

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
parseToCST<R>(text: string, filename: Readonly<URL>, startIndex: number, startRule: R, grammar: Grammar<R>, recoverNodeType: R, errorType: R, memo: Memo<R>): CSTNode<R>
```
**Parameters:**
- `text: string`
- `filename: Readonly<URL>`
- `startIndex: number`
- `startRule: R`
- `grammar: Grammar<R>`
- `recoverNodeType: R`
- `errorType: R` — default: `...`
- `memo: Memo<R>` — default: `{}`
**Returns:** `CSTNode<R>`

## span

### `locationsEqual`
Whether two (possibly undefined) Locations denote the same place.
```ts
locationsEqual(location1: Span | undefined, location2: Span | undefined): boolean
```
**Parameters:**
- `location1: Span | undefined`
- `location2: Span | undefined`
**Returns:** `boolean`

## walk

### `walkCombinator`
```ts
walkCombinator<T, E, R, P>(g: GrammarCombinator<R, P>, env: E, walker: CombinatorWalker<T, E, R, P>): T
```
**Parameters:**
- `g: GrammarCombinator<R, P>`
- `env: E`
- `walker: CombinatorWalker<T, E, R, P>`
**Returns:** `T`

### `hashCombinator`
A hash of a combinator tree, driven by the `hashFields` of each operation's
definition: like trees hash alike. Since there is no resolver, this is a
purely structural hash and is cached, so hashing a tree costs one walk,
ever.
```ts
hashCombinator(g: GrammarCombinator<any, any>): number
```
**Parameters:**
- `g: GrammarCombinator<any, any>`
**Returns:** `number`

### `serializeResolved`
The canonical serialization of a combinator tree with its parameter
references resolved: `param` nodes contribute the serialization of the
argument they name (resolved in the lexical scope), `ambient` nodes the
serialization of the dynamic binding they name (resolved in the dynamic scope
captured by that binding, so a binding's value never depends on itself), and
`bind` nodes serialize their body under the dynamic scope the bind creates.
Nothing is cached, since the result depends on the scopes, not just the
tree.

The serialization exactly encodes the fields that feed the combinator hash
(see `hashFields` on the operation definitions), in definition order, so it
can (in theory) be unparsed back into the resolved tree it came from.
Currently, the format is undocumented and there is no parsing function, but
there is also really no need to be parsing it.
```ts
serializeResolved<R, P>(g: GrammarCombinator<R, P>, locals: Locals<P>, dynamics: Dynamics, path: string): string
```
**Parameters:**
- `g: GrammarCombinator<R, P>`
- `locals: Locals<P>`
- `dynamics: Dynamics`
- `path: string`
**Returns:** `string`
**Throws:** If the grammar is invalid (there is a lexical or ambient parameter
  that isn't bound and has no default)

### `namedChildren`
The children `node` would have if it were condensed (see condenseCST),
computed from the raw tree without condensing it: ignored children are
dropped, unnamed containers dissolve into their own such children, and named
nodes, text leaves, and error nodes are kept as they are -- the original
nodes, not condensed rebuilds.

Nodes are immutable, so the result is cached per node in a WeakMap and the
same array is returned on every call; do not mutate it.
```ts
namedChildren<T>(node: CSTNode<T>): readonly CSTNode<T>[]
```
**Parameters:**
- `node: CSTNode<T>`
**Returns:** `readonly CSTNode<T>[]`

### `hashNode`
A structural hash of a CST. Ignores CSTNode.span|span and
CSTNode.value|value since the span can differ if the same text is
parsed twice in two different places, and the value is a mutable memoization
helper.

The result is cached, so hashing a tree costs one walk, ever. Structural
edits do not happen in place -- a traversal rebuilds the nodes above an edit,
and rebuilt nodes start with no cached hash.
```ts
hashNode<T>(node: CSTNode<T>): number
```
**Parameters:**
- `node: CSTNode<T>`
**Returns:** `number`

### `traverseCST`
Walk a CST the way @babel/traverse walks a Babel AST: every node -- named,
unnamed, ignored, and leaves alike -- is visited pre-order, and the visitor
steers the walk through the CSTPath it is handed (skip a subtree, stop
the walk, replace or remove nodes).

The walk is non-mutating. It returns the tree with every replacement applied:
a subtree nothing replaced in is returned as the very same objects, while a
node with a changed descendant is rebuilt -- same span, type, and flags, new
children, and neither `value` nor a cached hash carried over, since both may
have depended on the old children. Replacements made before a
CSTPath.stop still apply; the rest of the tree is returned as it
was.
```ts
traverseCST<T>(root: CSTNode<T>, visitor: CSTVisitor<T>): CSTNode<T>
```
**Parameters:**
- `root: CSTNode<T>`
- `visitor: CSTVisitor<T>`
**Returns:** `CSTNode<T>`

## compile

### `condenseCST`
Condense a CST as much as possible, preserving metadata spans:

- ignored children are removed
- A named node whose only child is considered ignored is itself considered
  ignored (recursively)
- Unnamed container nodes are merged into their parent
- Named nodes, text leaves, and error nodes stay as they are

The root is always a named node since a parse always starts at a named rule.
```ts
condenseCST<R>(cst: CSTNode<R>): CSTNode<R>
```
**Parameters:**
- `cst: CSTNode<R>`
**Returns:** `CSTNode<R>`

### `syncCompile`
```ts
syncCompile<T, R>(node: CSTNode<R>, tab: CompilerTable<R, (items: any, table: Record<string, any> | undefined, node: CSTNode<R>) => CompileBuilder<T, R>>, wrap: (compiled: any, node: CSTNode<R>) => any, handleError: (message: any) => any): any
```
**Parameters:**
- `node: CSTNode<R>`
- `tab: CompilerTable<R, (items: any, table: Record<string, any> | undefined, node: CSTNode<R>) => CompileBuilder<T, R>>`
- `wrap: (compiled: any, node: CSTNode<R>) => any`
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
