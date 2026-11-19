# Variables & Constants

## combinator

### `opDefs`
The definition of every grammar operation, keyed by its `op`.
```ts
const opDefs: { literal: { create: (pattern: string | [string, string]) => { pattern: Readonly<string | [string, string]> }; call: any; hashFields: ["pattern", Text][]; describe: (__namedParameters: { pattern: string | readonly [string, string] }) => string }; keyword: { create: (t: string, options: string[]) => { tag: string; options: readonly string[] }; call: any; hashFields: (["tag", Tag] | ["options", StringArray])[]; describe: (__namedParameters: { tag: string; options: readonly string[] }) => string }; opsym: { create: (t: string, op: string) => { tag: string; sym: string }; call: any; hashFields: (["tag", Tag] | ["sym", String])[]; describe: (__namedParameters: { tag: string; sym: string }) => string }; ignored: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; donate: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; adopt: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; rule: { create: (r: string, args: GrammarCombinator<any, any>[]) => { name: string; args: readonly GrammarCombinator<any, any>[] }; call: any; hashFields: (["name", String] | ["args", Children])[]; describe: (__namedParameters: { name: any; args: readonly GrammarCombinator<any, any>[] }) => string }; param: { create: (p: string, defaultValue?: GrammarCombinator<any, any>) => { name: string; default: GrammarCombinator<any, any> | undefined }; call: any; hashFields: (["name", String] | ["default", Child])[]; describe: (__namedParameters: { name: any; default: GrammarCombinator<any, any> | undefined }) => string }; ambient: { create: (p: string, defaultValue?: GrammarCombinator<any, any>) => { name: string; default: GrammarCombinator<any, any> | undefined }; call: any; hashFields: (["name", String] | ["default", Child])[]; describe: (__namedParameters: { name: string; default: GrammarCombinator<any, any> | undefined }) => string }; bind: { create: (p: string, extend: boolean, value: GrammarCombinator<any, any>, body: GrammarCombinator<any, any>) => { name: string; value: GrammarCombinator<any, any>; extend: boolean; body: GrammarCombinator<any, any> }; call: any; hashFields: (["name", String] | ["value", ScopedChild] | ["extend", Boolean] | ["body", Child])[]; describe: (__namedParameters: { name: string; value: GrammarCombinator<any, any>; extend: boolean; body: GrammarCombinator<any, any> }) => string }; sequence: { create: (s: GrammarCombinator<any, any> | undefined, n: GrammarCombinator<any, any>[]) => { items: readonly GrammarCombinator<any, any>[]; separator: GrammarCombinator<any, any> | undefined }; call: any; hashFields: (["items", Children] | ["separator", AuxChild])[]; describe: (__namedParameters: { items: readonly GrammarCombinator<any, any>[]; separator: GrammarCombinator<any, any> | undefined }) => string }; alternatives: { create: (first: boolean, n: GrammarCombinator<any, any>[]) => { options: readonly GrammarCombinator<any, any>[]; first: boolean }; call: any; hashFields: (["options", Children] | ["first", Boolean])[]; describe: (__namedParameters: { options: readonly GrammarCombinator<any, any>[]; first?: boolean }) => string }; optional: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; repeat: { create: (r: boolean, n: GrammarCombinator<any, any>) => { items: readonly GrammarCombinator<any, any>[]; required: boolean }; call: any; hashFields: (["items", Children] | ["required", Boolean])[]; describe: (__namedParameters: { items: readonly GrammarCombinator<any, any>[]; required: boolean }) => string }; joined: { create: (j: GrammarCombinator<any, any>, n: GrammarCombinator<any, any>, r2: boolean, t: boolean) => { joiner: GrammarCombinator<any, any>; element: GrammarCombinator<any, any>; require2: boolean; trailing: boolean }; call: any; hashFields: (["element", Child] | ["joiner", AuxChild] | ["require2", Boolean] | ["trailing", Boolean])[]; describe: (__namedParameters: { joiner: GrammarCombinator<any, any>; element: GrammarCombinator<any, any>; require2: boolean; trailing: boolean }) => string }; if: { create: (c: GrammarCombinator<any, any>, t: GrammarCombinator<any, any>, f: GrammarCombinator<any, any>) => { condition: GrammarCombinator<any, any>; ifTrue: GrammarCombinator<any, any>; ifFalse: GrammarCombinator<any, any> }; call: (ctx: OpContext<any>, __namedParameters: { condition: GrammarCombinator<any, any>; ifTrue: GrammarCombinator<any, any>; ifFalse: GrammarCombinator<any, any> }, path: string, i: number, locals: Locals<any>, dynamics: Dynamics) => CSTNode<any> | MatchFail; hashFields: (["condition", AuxChild] | ["ifTrue", Child] | ["ifFalse", Child])[]; describe: (__namedParameters: { condition: GrammarCombinator<any, any>; ifTrue: GrammarCombinator<any, any>; ifFalse: GrammarCombinator<any, any> }) => string }; tag: { create: (t: string, n: GrammarCombinator<any, any>) => { tag: string; child: GrammarCombinator<any, any> }; call: any; hashFields: (["tag", Tag] | ["child", Child])[]; describe: (__namedParameters: { tag: string; child: GrammarCombinator<any, any> }) => string }; cut: { create: (d: any) => { depth: any }; call: any; hashFields: ["depth", Number][]; describe: (__namedParameters: { depth: number }) => string }; lookahead: { create: (p: boolean, n: GrammarCombinator<any, any>) => { positive: boolean; child: GrammarCombinator<any, any> }; call: any; hashFields: (["child", Child] | ["positive", Boolean])[]; describe: (__namedParameters: { positive: boolean; child: GrammarCombinator<any, any> }) => string }; nonempty: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; sameline: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; nothing: { create: () => void; call: (ctx: OpContext<any>, __: void, ___: string, i: number) => CSTNode<null>; hashFields: never[]; describe: () => string }; try: { create: (n: GrammarCombinator<any, any>) => { child: GrammarCombinator<any, any> }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator<any, any> }) => string }; die: { create: (m: string) => { message: string }; call: (_: OpContext<any>, node: { message: string }, __: string, i: number) => MatchFail; hashFields: ["message", String][]; describe: (__namedParameters: { message: string }) => string } }
```

## combinatorFactory

### `lit`
Matches the literal string `str` exactly; produces a leaf holding that text.
```ts
const lit: (str: string) => GrammarCombinator<never, never>
```

### `regex`
Matches the regex `pattern` anchored at the current position (the engine adds
the sticky `y` flag); produces a leaf holding the matched text.
```ts
const regex: (pattern: RegExp) => GrammarCombinator<never, never>
```

### `kw`
Matches any one of the given options between regex `\b` separators; the
result is tagged with tag and CSTNode.ignored | ignored.
```ts
const kw: (tag: string, options: string[]) => GrammarCombinator<never, never>
```

### `op`
Matches this operator, but also asserts that it doesn't also simultaneously
match any other longer operator defined elsewhere in the grammar.
```ts
const op: (tag: string, op: string) => GrammarCombinator<never, never>
```

### `ignored`
Parses `node` but flags the result CSTNode.ignored | ignored: its text
stays in the CST (so concatenating all leaves still reproduces the source)
but marks it as ok to be dropped later, when you lower the CST to an AST.
```ts
const ignored: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `donate`
Parses `node` and marks the resulting CST node as a name donor for the
nearest enclosing adopt: if the donated node lands as a direct child
of the node an `adopt` produces, that node takes the donor's type as its own
name, and the donor is flagged CSTNode.ignored | ignored (they stay in
the tree, so the source is still reproduced exactly, but they are dropped
when the CST is condensed) while any named children it captured are promoted
into the adopted node in its place. A donated node that never lands as a
direct child of an adopted node has no effect.
```ts
const donate: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `adopt`
Parses `node`; if the result is an unnamed container with a direct child that
was marked by donate, the container adopts that child's type as its
own name (and the child dissolves into it; see donate). Named nodes,
leaves, error nodes, and containers with no donated child pass through
unchanged. This is how a shared parameterized rule (such as a generic
binary-operator rule) can produce nodes named after the specific thing that
matched inside it.
```ts
const adopt: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `rule`
Invokes the named rule from the grammar; the result is wrapped in a node
CSTNode.type | typed `ruleName`, unless the rule only delegated to
another named rule. Extra combinators are arguments, for calling a
ParameterizedRule | parameterized rule.
```ts
const rule: (ruleName: R, args: GrammarCombinator<RA, P>[]) => GrammarCombinator<NoInfer<R | RA>, NoInfer<P>>
```

### `param`
Evaluates the argument combinator bound to the parameter of the enclosing
ParameterizedRule | parameterized rule, in the scope where that
argument was written. If the parameter is unbound and a `defaultValue` is
given, the default is evaluated instead, in the scope in effect at this
reference; with no default, an unbound parameter is an error.
```ts
const param: { (parameterName: P): GrammarCombinator<never, NoInfer<P>>; (parameterName: string, defaultValue: GrammarCombinator<R, P>): GrammarCombinator<NoInfer<R>, NoInfer<P>> }
```

### `ambient`
Evaluates the combinator bound to the dynamic parameter by the nearest
enclosing bind. Dynamic parameters are ambient context: any rule
parsed within the bind's extent can read them without receiving them as
arguments. If it is unbound and a `defaultValue` is given, the default is
evaluated instead, in the scope in effect at this reference; with no default,
an unbound dynamic parameter is an error.
```ts
const ambient: { (varName: string): GrammarCombinator<never, never>; (varName: string, defaultValue: GrammarCombinator<R, P>): GrammarCombinator<NoInfer<R>, NoInfer<P>> }
```

### `bind`
Parses `body` with the dynamic parameter bound to `value` for the body's
dynamic extent (including any rules it calls, however deep). Inside `value`,
ambient | `ambient(p)` still refers to the binding this one shadows,
so a new value can extend the old one.
```ts
const bind: (varName: string, extend: boolean, value: GrammarCombinator<R, P>, body: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `no`
Always fails, but not a hard failure.
```ts
const no: () => GrammarCombinator<never, never>
```

### `opt`
Matches `node` if it succeeds, otherwise succeeds empty -- unless `node`
failed after a cut, in which case the failure propagates.
```ts
const opt: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `rep`
Repeats `node` greedily until it fails ordinarily; `required` = true requires
at least one match, false allows zero.
```ts
const rep: (required: boolean, node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `joined`
Matches `node` separated by `joiner` (`node`, `node` `joiner` `node`, ...),
keeping elements and separators in one flat result.
```ts
const joined: (joiner: GrammarCombinator<R, P>, bodyNode: GrammarCombinator<R, P>, requireTwo: boolean, allowTrailingJoiner: boolean) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `if_`
Evaluates `condition` as a positive lookahead (consuming no input);
matches `ifTrue` if it succeeds, `ifFalse` otherwise.
```ts
const if_: (condition: GrammarCombinator<R, P>, ifTrue: GrammarCombinator<R, P>, ifFalse: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `tag`
Parses `node` and tags the result with `tag` (the visual kind used for syntax
highlighting).
```ts
const tag: (tag: string, node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `cut`
Once matched, a later failure no longer falls back to sibling alternatives;
`depth` is how many enclosing choice levels the commitment spans. Produces an
empty CSTNode.ignored | ignored node.
```ts
const cut: (depth?: number) => GrammarCombinator<never, never>
```

### `lookahead`
Asserts that `node` matches (`positive` = true) or does not match (`positive`
= false) at the current position, consuming no input.
```ts
const lookahead: (positive: boolean, node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `nonempty`
Parses `node` and fails if it matched the empty string.
```ts
const nonempty: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `sameline`
Parses `node` and fails if the matched span contains a newline.
```ts
const sameline: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `nothing`
Always matches, consuming no input.
```ts
const nothing: () => GrammarCombinator<never, never>
```

### `yes`
Always matches, consuming no input.
```ts
const yes: () => GrammarCombinator<never, never>
```

### `try_`
Parses `node` speculatively: if it fails, any cut inside it is hidden,
so the failure looks ordinary and enclosing alternatives can still fall
back.
```ts
const try_: (node: GrammarCombinator<R, P>) => GrammarCombinator<NoInfer<R>, NoInfer<P>>
```

### `die`
Always fails, with `message` naming what was expected. The failure carries an
infinite cut, so no alternative or recovery is attempted past it.
```ts
const die: (message: string) => GrammarCombinator<never, never>
```

## grammar

### `defineGrammar`
Purely for type checking, at runtime this is literally the identity function.

Defines a grammar, inferring the rule names from the definition's own keys,
so that rule references and parameter references can be checked at the
definition site without having to write an explicit `Grammar&lt;...&gt;` annotation
with all the rule names.

A metadata type for the entries' extra fields can be given explicitly as the
first type argument; it defaults to `unknown`, which allows no extra fields.
```ts
const defineGrammar: (grammar: G) => Grammar<keyof G & string, M>
```
