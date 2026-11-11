# Variables & Constants

## combinator

### `opDefs`
The definition of every grammar operation, keyed by its `op`.
```ts
const opDefs: { literal: { create: (pattern: string | [string, string]) => { pattern: string | [string, string] }; call: any; hashFields: ["pattern", Text][]; describe: (__namedParameters: { pattern: string | [string, string] }) => string }; keyword: { create: (t: string, options: string[]) => { tag: string; options: string[] }; call: any; hashFields: (["tag", Tag] | ["options", StringArray])[]; describe: (__namedParameters: { tag: string; options: string[] }) => string }; opsym: { create: (t: string, op: string) => { tag: string; sym: string }; call: any; hashFields: (["tag", Tag] | ["sym", String])[]; describe: (__namedParameters: { tag: string; sym: string }) => string }; ignored: { create: (n: GrammarCombinator) => { child: GrammarCombinator }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator }) => string }; rule: { create: (r: string, args: GrammarCombinator[]) => { name: string; args: GrammarCombinator[] }; call: any; hashFields: (["name", String] | ["args", Children])[]; describe: (__namedParameters: { name: string; args: GrammarCombinator[] }) => string }; param: { create: (p: string, defaultValue?: GrammarCombinator) => { name: string; default: GrammarCombinator | undefined }; call: any; hashFields: (["name", String] | ["default", Child])[]; describe: (__namedParameters: { name: string; default: GrammarCombinator | undefined }) => string }; ambient: { create: (p: string, defaultValue?: GrammarCombinator) => { name: string; default: GrammarCombinator | undefined }; call: any; hashFields: (["name", String] | ["default", Child])[]; describe: (__namedParameters: { name: string; default: GrammarCombinator | undefined }) => string }; bind: { create: (p: string, extend: boolean, value: GrammarCombinator, body: GrammarCombinator) => { name: string; value: GrammarCombinator; extend: boolean; body: GrammarCombinator }; call: any; hashFields: (["name", String] | ["value", ScopedChild] | ["extend", Boolean] | ["body", Child])[]; describe: (__namedParameters: { name: string; value: GrammarCombinator; extend: boolean; body: GrammarCombinator }) => string }; sequence: { create: (s: GrammarCombinator | undefined, n: GrammarCombinator[]) => { items: GrammarCombinator[]; separator: GrammarCombinator | undefined }; call: any; hashFields: (["items", Children] | ["separator", AuxChild])[]; describe: (__namedParameters: { items: GrammarCombinator[]; separator: GrammarCombinator | undefined }) => string }; alternatives: { create: (first: boolean, n: GrammarCombinator[]) => { options: GrammarCombinator[]; first: boolean }; call: any; hashFields: (["options", Children] | ["first", Boolean])[]; describe: (__namedParameters: { options: GrammarCombinator[]; first?: boolean }) => string }; optional: { create: (n: GrammarCombinator) => { child: GrammarCombinator }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator }) => string }; repeat: { create: (r: boolean, n: GrammarCombinator) => { items: GrammarCombinator[]; required: boolean }; call: any; hashFields: (["items", Children] | ["required", Boolean])[]; describe: (__namedParameters: { items: GrammarCombinator[]; required: boolean }) => string }; joined: { create: (j: GrammarCombinator, n: GrammarCombinator, r2: boolean, t: boolean) => { joiner: GrammarCombinator; element: GrammarCombinator; require2: boolean; trailing: boolean }; call: any; hashFields: (["element", Child] | ["joiner", AuxChild] | ["require2", Boolean] | ["trailing", Boolean])[]; describe: (__namedParameters: { joiner: GrammarCombinator; element: GrammarCombinator; require2: boolean; trailing: boolean }) => string }; if: { create: (c: GrammarCombinator, t: GrammarCombinator, f: GrammarCombinator) => { condition: GrammarCombinator; ifTrue: GrammarCombinator; ifFalse: GrammarCombinator }; call: (ctx: OpContext, __namedParameters: { condition: GrammarCombinator; ifTrue: GrammarCombinator; ifFalse: GrammarCombinator }, path: string, i: number, locals: Locals, dynamics: Dynamics) => CSTNode | MatchFail; hashFields: (["condition", AuxChild] | ["ifTrue", Child] | ["ifFalse", Child])[]; describe: (__namedParameters: { condition: GrammarCombinator; ifTrue: GrammarCombinator; ifFalse: GrammarCombinator }) => string }; tag: { create: (t: string, n: GrammarCombinator) => { tag: string; child: GrammarCombinator }; call: any; hashFields: (["tag", Tag] | ["child", Child])[]; describe: (__namedParameters: { tag: string; child: GrammarCombinator }) => string }; cut: { create: (d: any) => { depth: any }; call: any; hashFields: ["depth", Number][]; describe: (__namedParameters: { depth: number }) => string }; lookahead: { create: (p: boolean, n: GrammarCombinator) => { positive: boolean; child: GrammarCombinator }; call: any; hashFields: (["child", Child] | ["positive", Boolean])[]; describe: (__namedParameters: { positive: boolean; child: GrammarCombinator }) => string }; nonempty: { create: (n: GrammarCombinator) => { child: GrammarCombinator }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator }) => string }; sameline: { create: (n: GrammarCombinator) => { child: GrammarCombinator }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator }) => string }; nothing: { create: () => void; call: (ctx: OpContext, __: void, ___: string, i: number) => { span: Span }; hashFields: never[]; describe: () => string }; try: { create: (n: GrammarCombinator) => { child: GrammarCombinator }; call: any; hashFields: ["child", Child][]; describe: (__namedParameters: { child: GrammarCombinator }) => string }; die: { create: (m: string) => { message: string }; call: (_: OpContext, node: { message: string }, __: string, i: number) => MatchFail; hashFields: ["message", String][]; describe: (__namedParameters: { message: string }) => string } }
```

## combinatorFactory

### `kw`
Matches any one of the given options between regex `\b` separators; the
result is tagged with tag and CSTNode.ignored | ignored.
```ts
const kw: (tag: string, options: string[]) => GrammarCombinator
```

### `op`
Matches this operator, but also asserts that it doesn't also simultaneously
match any other longer operator defined elsewhere in the grammar.
```ts
const op: (tag: string, op: string) => GrammarCombinator
```

### `ignored`
Parses `node` but flags the result CSTNode.ignored | ignored: its text
stays in the CST (so concatenating all leaves still reproduces the source)
but marks it as ok to be dropped later, when you lower the CST to an AST.
```ts
const ignored: (node: GrammarCombinator) => GrammarCombinator
```

### `rule`
Invokes the named rule from the grammar; the result is wrapped in a node
CSTNode.type | typed `ruleName`, unless the rule only delegated to
another named rule. Extra combinators are arguments, for calling a
ParameterizedRule | parameterized rule.
```ts
const rule: (ruleName: string, args: GrammarCombinator[]) => GrammarCombinator
```

### `param`
Evaluates the argument combinator bound to the parameter of the enclosing
ParameterizedRule | parameterized rule, in the scope where that
argument was written. If the parameter is unbound and a `defaultValue` is
given, the default is evaluated instead, in the scope in effect at this
reference; with no default, an unbound parameter is an error.
```ts
const param: (parameterName: string, defaultValue?: GrammarCombinator) => GrammarCombinator
```

### `ambient`
Evaluates the combinator bound to the dynamic parameter by the nearest
enclosing bind. Dynamic parameters are ambient context: any rule
parsed within the bind's extent can read them without receiving them as
arguments. If it is unbound and a `defaultValue` is given, the default is
evaluated instead, in the scope in effect at this reference; with no default,
an unbound dynamic parameter is an error.
```ts
const ambient: (varName: string, defaultValue?: GrammarCombinator) => GrammarCombinator
```

### `bind`
Parses `body` with the dynamic parameter bound to `value` for the body's
dynamic extent (including any rules it calls, however deep). Inside `value`,
ambient | `ambient(p)` still refers to the binding this one shadows,
so a new value can extend the old one.
```ts
const bind: (varName: string, extend: boolean, value: GrammarCombinator, body: GrammarCombinator) => GrammarCombinator
```

### `opt`
Matches `node` if it succeeds, otherwise succeeds empty -- unless `node`
failed after a cut, in which case the failure propagates.
```ts
const opt: (node: GrammarCombinator) => GrammarCombinator
```

### `rep`
Repeats `node` greedily until it fails ordinarily; `required` = true requires
at least one match, false allows zero.
```ts
const rep: (required: boolean, node: GrammarCombinator) => GrammarCombinator
```

### `joined`
Matches `node` separated by `joiner` (`node`, `node` `joiner` `node`, ...),
keeping elements and separators in one flat result.
```ts
const joined: (joiner: GrammarCombinator, bodyNode: GrammarCombinator, requireTwo: boolean, allowTrailingJoiner: boolean) => GrammarCombinator
```

### `if_`
Evaluates `condition` as a positive lookahead (consuming no input);
matches `ifTrue` if it succeeds, `ifFalse` otherwise.
```ts
const if_: (condition: GrammarCombinator, ifTrue: GrammarCombinator, ifFalse: GrammarCombinator) => GrammarCombinator
```

### `tag`
Parses `node` and tags the result with `tag` (the visual kind used for syntax
highlighting).
```ts
const tag: (tag: string, node: GrammarCombinator) => GrammarCombinator
```

### `cut`
Once matched, a later failure no longer falls back to sibling alternatives;
`depth` is how many enclosing choice levels the commitment spans. Produces an
empty CSTNode.ignored | ignored node.
```ts
const cut: (depth?: any) => GrammarCombinator
```

### `lookahead`
Asserts that `node` matches (`positive` = true) or does not match (`positive`
= false) at the current position, consuming no input.
```ts
const lookahead: (positive: boolean, node: GrammarCombinator) => GrammarCombinator
```

### `nonempty`
Parses `node` and fails if it matched the empty string.
```ts
const nonempty: (node: GrammarCombinator) => GrammarCombinator
```

### `sameline`
Parses `node` and fails if the matched span contains a newline.
```ts
const sameline: (node: GrammarCombinator) => GrammarCombinator
```

### `nothing`
Always matches, consuming no input.
```ts
const nothing: () => GrammarCombinator
```

### `yes`
Always matches, consuming no input.
```ts
const yes: () => GrammarCombinator
```

### `try_`
Parses `node` speculatively: if it fails, any cut inside it is hidden,
so the failure looks ordinary and enclosing alternatives can still fall
back.
```ts
const try_: (node: GrammarCombinator) => GrammarCombinator
```

### `die`
Always fails, with `message` naming what was expected. The failure carries an
infinite cut, so no alternative or recovery is attempted past it.
```ts
const die: (message: string) => GrammarCombinator
```
