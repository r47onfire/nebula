import { isArray } from "lib0/array";
import { stringify } from "lib0/json";
import { max } from "lib0/math";
import { ambient, bind, nothing, param, rule, seq } from "./combinatorFactory";
import { OpContext } from "./context";
import { CSTNode } from "./cst";
import { MatchFail } from "./parseToCST";
import { hashResolved, walkCombinator } from "./walk";

export type OpMemo = Record<string, string[]>;

/**
 * The fields of every operation's node, one entry per operation. This is a
 * separate interface (rather than being inferred from the shape of
 * {@link opDefs}) because Typescript is stupid and can't infer it from the shape
 * of {@link opDefs}.
 */
export interface OpNodeShapes<R extends string, P extends string> {
    literal: { pattern: string | [string, string] };
    keyword: { tag: string; options: string[] };
    opsym: { tag: string; sym: string };
    ignored: { child: GrammarCombinator<R, P> };
    donate: { child: GrammarCombinator<R, P> };
    adopt: { child: GrammarCombinator<R, P> };
    rule: { name: R; args: GrammarCombinator<R, P>[] };
    param: { name: P; default: GrammarCombinator<R, P> | undefined };
    ambient: { name: string; default: GrammarCombinator<R, P> | undefined };
    bind: {
        name: string;
        value: GrammarCombinator<R, P>;
        extend: boolean;
        body: GrammarCombinator<R, P>;
    };
    sequence: {
        items: GrammarCombinator<R, P>[];
        separator: GrammarCombinator<R, P> | undefined;
    };
    alternatives: { options: GrammarCombinator<R, P>[]; first?: boolean };
    optional: { child: GrammarCombinator<R, P> };
    repeat: { items: GrammarCombinator<R, P>[]; required: boolean };
    joined: {
        joiner: GrammarCombinator<R, P>;
        element: GrammarCombinator<R, P>;
        require2: boolean;
        trailing: boolean;
    };
    if: {
        condition: GrammarCombinator<R, P>;
        ifTrue: GrammarCombinator<R, P>;
        ifFalse: GrammarCombinator<R, P>;
    };
    tag: { tag: string; child: GrammarCombinator<R, P> };
    cut: { depth: number };
    lookahead: { positive: boolean; child: GrammarCombinator<R, P> };
    nonempty: { child: GrammarCombinator<R, P> };
    sameline: { child: GrammarCombinator<R, P> };
    nothing: void;
    try: { child: GrammarCombinator<R, P> };
    die: { message: string };
}

/**
 * The operation a {@link GrammarCombinator} performs; determines which of the
 * per-operation subtypes a node is, and so which named fields it has.
 */
export type GrammarOp = keyof OpNodeShapes<any, any>;

/**
 * Every subtype carries a lazily filled cache of its structural hash (see
 * {@link hashCombinator}).
 */
export interface CombinatorBase {
    /** Cached structural hash; filled in by {@link hashCombinator} */
    hash?: number;
    readonly op: string;
}

/**
 * A single grammar node. Combinators are plain serializable data (no
 * functions), so grammars can be built, inspected, and patched as values. Each
 * operation has its own subtype with explicitly named fields; the per-operation
 * definitions (how a node is created, parsed, hashed, and rendered) live
 * together in the `opDefs` table below.
 */
export type GrammarCombinator<R extends string, P extends string> = {
    [O in GrammarOp]: CombinatorBase & { readonly op: O } & OpNodeShapes<
            R,
            P
        >[O];
}[GrammarOp] & {
    /**
     * Phantom brands (never set at runtime): the rule names this combinator
     * tree can invoke, and the parameter names it can reference. They live at
     * the top level, outside the per-operation union, because TypeScript gets
     * very confused when you try to have it infer recursively into union
     * members.
     */
    readonly ___rules_nonexistent_at_runtime?: R;
    readonly ___params_nonexistent_at_runtime?: P;
};

/**
 * The memo path of a parameterized rule invocation names the instance by the
 * rule name plus the resolved hashes of its arguments (see
 * {@link hashResolved}), so different instances of the same rule memoize
 * separately. Resolving matters: `rule("e", param("op"))` inside a rule where
 * `op` is bound to `lit("+")` is the _same_ instance as `rule("e", lit("+"))`
 * (in particular, a rule recursing on its own parameters recurses on itself, so
 * left recursion still engages).
 */
const instancePath = (
    name: string,
    args: readonly GrammarCombinator<any, any>[],
    locals: Locals<any>,
    dynamics: Dynamics,
    path: string,
): string =>
    name +
    "(" +
    args
        .map((a) => hashResolved(a, locals, dynamics, path).toString(36))
        .join(",") +
    ")";

/**
 * One argument binding of a parameterized rule invocation: the argument
 * combinator, plus the parameter scope in effect where the argument was
 * written, so that evaluating it later (via the `param` op) resolves any
 * parameters it mentions in the call site's scope, not the callee's.
 */
export interface ParamBinding {
    readonly node: GrammarCombinator<any, any>;
    readonly locals: Locals<any>;
}

/**
 * Internal implementation detail of the parser (used by parameterized
 * {@link rule} and {@link param}).
 *
 * A parameter scope: the bindings of one parameterized rule invocation, chained
 * to the enclosing scope. Scopes are immutable.
 */
export interface ParamFrame<P extends string> {
    readonly bindings: Readonly<Record<P, ParamBinding>>;
    readonly next: Locals<any>;
}
export type Locals<P extends string> = ParamFrame<P> | undefined;

/**
 * Internal implementation detail of the parser (used by dynamic {@link bind} and
 * {@link ambient}).
 *
 * The dynamic scope: a chain of dynamic bindings (bound value, scopes in which
 * it was created), innermost first. Like the {@link ParamFrame} it immutable.
 */
export interface DynBindingFrame {
    readonly name: string;
    readonly node: GrammarCombinator<any, any>;
    readonly locals: Locals<any>;
    readonly next: Dynamics;
    /**
     * Unique string hash of this chain, mixed into memo keys to keep cache
     * entries specific to this exact scope's bindings.
     */
    readonly key: string;
}
export type Dynamics = DynBindingFrame | undefined;

/**
 * How one field of a combinator is mixed into its hash (see `hashFields` on
 * {@link GrammarOpDef}).
 */
export enum MixAction {
    /** A string */
    String,
    /** Same as {@link String} but semantically a tag */
    Tag,
    Number,
    Boolean,
    /**
     * A string or an array of strings (essentially the union of {@link String}
     * plus {@link StringArray})
     */
    Text,
    /** An array of strings */
    StringArray,
    /** A single sub-combinator, handled recursively */
    Child,
    /**
     * A single sub-combinator, handled recursively, which changes the scope
     * available to its children
     */
    ScopedChild,
    /** An array of sub-combinators, each handled recursively */
    Children,
    /**
     * A single sub-combinator in the auxiliary role (separator, joiner,
     * condition), that should be hashed with a different constant so it cannot
     * be confused with a sequential child
     */
    AuxChild,
}

/**
 * The definition of one grammar operation: how its nodes are created (`create`,
 * also exported as the operation's factory function), how they are parsed
 * (`call`), which of their fields feed the combinator hash (`hashFields`), and
 * how they are rendered for debugging (`describe`). Keeping all four together
 * in this table is what lets the parser's dispatcher, the hash function, and
 * the debug renderer stay generic over operations. This is the loose common
 * shape of a definition; each entry in {@link opDefs} is more precise (its
 * `call` and `describe` are typed against the exact node shape its own `create`
 * returns).
 */
export interface GrammarOpDef<N> {
    create: (...args: any[]) => N;
    call: (
        ctx: OpContext<any>,
        node: N,
        path: string,
        i: number,
        locals: Locals<any>,
        dynamics: Dynamics,
    ) => CSTNode<any> | MatchFail;
    hashFields: readonly (readonly [field: keyof N, action: MixAction])[];
    describe: (node: N) => string;
}

const singleChild = (n: GrammarCombinator<any, any>) => ({ child: n });

/**
 * The (weak) type of {@link opDefs}: every operation's definition, tied to its
 * declared node shape in {@link OpNodeShapes}.
 */
export type OpDefs = {
    [O in GrammarOp]: GrammarOpDef<OpNodeShapes<any, any>[O]>;
};

/** The definition of every grammar operation, keyed by its `op`. */
export const opDefs = {
    // ---------------------------------------------------------------------------
    // tok

    literal: {
        create: (pattern: string | [string, string]) => ({ pattern }),
        call(ctx, node, _, i) {
            const pattern = node.pattern;
            if (isArray(pattern)) {
                const re = new RegExp(pattern[0], pattern[1] + "y");
                re.lastIndex = i;
                const match = re.exec(ctx.text);
                return match
                    ? new CSTNode(
                          ctx.createSpan(i, i + match[0].length),
                          null,
                          [],
                          false,
                          null,
                          match[0],
                      )
                    : new MatchFail(i, 0, node as GrammarCombinator<any, any>);
            }
            return ctx.text.startsWith(pattern, i)
                ? new CSTNode(
                      ctx.createSpan(i, i + pattern.length),
                      null,
                      [],
                      false,
                      null,
                      pattern,
                  )
                : new MatchFail(i, 0, node as GrammarCombinator<any, any>);
        },
        hashFields: [["pattern", MixAction.Text]],
        describe: ({ pattern }) =>
            isArray(pattern)
                ? "/" + pattern[0] + "/" + pattern[1]
                : stringify(pattern),
    },

    // ---------------------------------------------------------------------------
    // kw

    keyword: {
        create: (t: string, ...options: string[]) => ({ tag: t, options }),
        call(ctx, node, _, i) {
            const { options, tag } = node;
            const re = new RegExp(
                "\\b(" + options.map(RegExp.escape).join("|") + ")\\b",
                "y",
            );
            re.lastIndex = i;
            const match = re.exec(ctx.text);
            return match
                ? new CSTNode(
                      ctx.createSpan(i, i + match[0].length),
                      null,
                      [],
                      true,
                      tag,
                      match[0],
                  )
                : new MatchFail(i, 0, node as GrammarCombinator<any, any>);
        },
        hashFields: [
            ["tag", MixAction.Tag],
            ["options", MixAction.StringArray],
        ],
        describe: ({ tag, options }) => "%" + tag + "=" + options.join("/"),
    },

    // ---------------------------------------------------------------------------
    // op
    opsym: {
        create: (t: string, op: string) => ({ tag: t, sym: op }),
        call(ctx, node, _, i) {
            const memo = (ctx.memo.__operators ??= ((): OpMemo => {
                const allOps = Object.values(ctx.grammar)
                    .map((x): GrammarCombinator<any, any> => x.def)
                    .reduce(
                        (prev, x) => [
                            ...prev,
                            ...walkCombinator(x, undefined, {
                                leaf: (node) =>
                                    node.op === "opsym" ? [node.sym] : [],
                                fold: (fields) => fields.flatMap((x) => x[2]),
                            }),
                        ],
                        [] as string[],
                    );
                const memo = Object.fromEntries(
                    allOps.map((x) => [
                        x,
                        allOps
                            .filter((op) => op !== x && op.startsWith(x))
                            .map((op) => op.slice(x.length)),
                    ]),
                );
                // console.log(memo);
                return memo;
            })());
            const { sym, tag } = node;
            return ctx.text.startsWith(sym, i) &&
                memo[sym]!.every((s) => !ctx.text.startsWith(s, i + sym.length))
                ? new CSTNode(
                      ctx.createSpan(i, i + sym.length),
                      null,
                      [],
                      true,
                      tag,
                      sym,
                  )
                : new MatchFail(i, 0, node as GrammarCombinator<any, any>);
        },
        hashFields: [
            ["sym", MixAction.String],
            ["tag", MixAction.Tag],
        ],
        describe: ({ tag, sym }) => "~" + tag + "=" + stringify(sym),
    },

    // ---------------------------------------------------------------------------
    // ign

    ignored: {
        create: singleChild,
        call(ctx, { child }, path, i, locals, dynamics) {
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            return cst instanceof MatchFail
                ? cst
                : new CSTNode(cst.span, null, [cst], true);
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => ";" + describeCombinator(child),
    },

    // ---------------------------------------------------------------------------
    // donate / adopt

    donate: {
        create: singleChild,
        call(ctx, { child }, path, i, locals, dynamics) {
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            if (cst instanceof MatchFail) return cst;
            // Mark the produced node as a name donor for the nearest
            // enclosing adopt. The registry lives on the parse memo, next
            // to the operator-guard memo, and dies with the parse.
            (ctx.memo.__donors ??= new Set()).add(cst);
            return cst;
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => describeCombinator(child),
    },

    adopt: {
        create: singleChild,
        call(ctx, { child }, path, i, locals, dynamics) {
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            if (cst instanceof MatchFail) return cst;
            // Only an unnamed container can take a new name; named nodes,
            // leaves, and error nodes pass through untouched.
            if (
                cst.type !== null ||
                cst.text !== null ||
                cst.errorExpected !== undefined
            )
                return cst;
            const donors = ctx.memo.__donors;
            const donorIndex = donors
                ? cst.children.findIndex(
                      (n) => n.type !== null && donors.has(n),
                  )
                : -1;
            if (donorIndex < 0) return cst;
            const donor = cst.children[donorIndex]!;
            // The container takes the donor's name, and the donor dissolves
            // into it: unnamed containers inside the donor flatten away,
            // the donor's own text leaves are flagged ignored (the
            // operator's spelling is not part of the AST), and any named
            // children it captured  are promoted into the container in its
            // lace. Every leaf stays in the tree exactly once, in order,
            // so the source is still reproduced exactly.
            const dissolve = (
                children: readonly CSTNode<any>[],
            ): CSTNode<any>[] =>
                children.flatMap((n) => {
                    if (n.text !== null)
                        return [
                            n.ignored
                                ? n
                                : new CSTNode(
                                      n.span,
                                      n.type,
                                      n.children,
                                      true,
                                      n.tag,
                                      n.text,
                                      n.errorExpected,
                                  ),
                        ];
                    if (
                        n.type === null &&
                        !n.ignored &&
                        n.errorExpected === undefined
                    )
                        return dissolve(n.children);
                    return [n];
                });
            return new CSTNode(
                cst.span,
                donor.type,
                [
                    ...cst.children.slice(0, donorIndex),
                    ...dissolve(donor.children),
                    ...cst.children.slice(donorIndex + 1),
                ],
                cst.ignored,
                cst.tag,
                cst.text,
                cst.errorExpected,
            );
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => describeCombinator(child),
    },

    // ---------------------------------------------------------------------------
    // rule

    rule: {
        create: (r: string, ...args: GrammarCombinator<any, any>[]) => ({
            name: r,
            args,
        }),
        call(ctx, { name, args = [] }, path, i, locals, dynamics) {
            const entry = ctx.grammar[name];
            if (!entry)
                throw new Error("unknown named rule " + name + " at " + path);
            var bodyPath = name,
                bodyLocals = locals;
            const { def, params } = entry;
            if (params && params.length > 0) {
                // Parameterized rule: bind the supplied arguments, each
                // capturing the scope in effect at this call site, and
                // evaluate the body under a memo path that names the
                // instance (the rule name plus the hashes of its argument
                // combinators), so that different instances of the same rule
                // memoize separately. Arguments may be omitted from the
                // end; an omitted parameter remains unbound, so a reference
                // through `param(name, default)` uses its default, while a
                // reference with no default reports the parameter as unbound.
                if (args.length > params.length)
                    throw new Error(
                        `too many arguments to rule ${name} (expected ${params.length} but got ${args.length}) at ${path}`,
                    );
                const bindings: Record<string, ParamBinding> = {};
                for (var k = 0; k < args.length; k++)
                    bindings[params[k]!] = { node: args[k]!, locals };
                bodyPath = instancePath(name, args, locals, dynamics, path);
                bodyLocals = { bindings, next: locals };
            } else {
                if (args.length)
                    throw new Error(
                        "rule " + name + " takes no arguments at " + path,
                    );
            }
            ctx.pushCutFrame();
            const cst = ctx.applyRule(bodyPath, def, i, bodyLocals, dynamics);
            const frameDepth = ctx.popCutFrame();
            if (cst instanceof MatchFail) {
                const d = max(cst.cut, frameDepth);
                return d === cst.cut
                    ? cst
                    : new MatchFail(cst.i, d, cst.expected);
            }
            // Don't nest when the rule only delegated to another named rule
            if (cst.text === null && cst.type !== null) return cst;
            return new CSTNode(cst.span, name, [cst], false);
        },
        hashFields: [
            ["name", MixAction.String],
            ["args", MixAction.Children],
        ],
        describe: ({ name, args }) =>
            "<" +
            name +
            (args.length
                ? "(" +
                  args.map((arg) => describeCombinator(arg)).join(", ") +
                  ")"
                : "") +
            ">",
    },

    // ---------------------------------------------------------------------------
    // param

    param: {
        create: (p: string, defaultValue?: GrammarCombinator<any, any>) => ({
            name: p,
            default: defaultValue,
        }),
        call(ctx, { name, default: defaultValue }, path, i, locals, dynamics) {
            for (var scope = locals; scope; scope = scope.next) {
                const binding = scope.bindings[name];
                // Evaluate the argument under its own memo path: the memo is
                // keyed by path alone, so reusing this reference's path would
                // collide with the param op's own in-progress entry. The
                // argument's own parameters resolve in the scope it captured,
                // but any dynamic parameters it mentions resolve in the
                // ambient context in effect here, at its use.
                if (binding)
                    return ctx.applyRule(
                        path + "$" + name,
                        binding.node,
                        i,
                        binding.locals,
                        dynamics,
                    );
            }
            if (defaultValue)
                return ctx.applyRule(
                    path + "$" + name,
                    defaultValue,
                    i,
                    locals,
                    dynamics,
                );
            throw new Error("unbound rule parameter " + name + " at " + path);
        },
        hashFields: [
            ["name", MixAction.String],
            ["default", MixAction.Child],
        ],
        describe: ({ name, default: defaultValue }) =>
            "$" +
            name +
            (defaultValue ? ":" + describeCombinator(defaultValue) : ""),
    },

    // ---------------------------------------------------------------------------
    // ambient

    ambient: {
        create: (p: string, defaultValue?: GrammarCombinator<any, any>) => ({
            name: p,
            default: defaultValue,
        }),
        call(ctx, { name, default: defaultValue }, path, i, locals, dynamics) {
            for (var dyn = dynamics; dyn; dyn = dyn.next) {
                // As with param, the value gets its own memo path -- and the
                // path names the binding's frame key, because the same
                // reference under different bindings must not share a memo
                // entry even though the value is evaluated in the scope
                // outside the bind. It is evaluated with the lexical scope of
                // the bind that supplied it, and the dynamic scope outside
                // that bind.
                if (dyn.name === name)
                    return ctx.applyRule(
                        path + "$@" + name + "#" + dyn.key,
                        dyn.node,
                        i,
                        dyn.locals,
                        dyn.next,
                    );
            }
            if (defaultValue)
                return ctx.applyRule(
                    path + "$@" + name,
                    defaultValue,
                    i,
                    locals,
                    dynamics,
                );
            throw new Error(
                "unbound dynamic parameter " + name + " at " + path,
            );
        },
        hashFields: [
            ["name", MixAction.String],
            ["default", MixAction.Child],
        ],
        describe: ({ name, default: defaultValue }) =>
            "@" +
            name +
            (defaultValue ? ":" + describeCombinator(defaultValue) : ""),
    },

    // ---------------------------------------------------------------------------
    // bind

    bind: {
        create: (
            p: string,
            extend: boolean,
            value: GrammarCombinator<any, any>,
            body: GrammarCombinator<any, any>,
        ) => ({ name: p, value, extend, body }),
        call(ctx, { name, value, extend, body }, path, i, locals, dynamics) {
            const frame: DynBindingFrame = {
                name,
                node: extend ? seq(ambient(name, nothing()), value) : value,
                locals,
                next: dynamics,
                key:
                    (dynamics ? dynamics.key + "/" : "") +
                    name +
                    "#" +
                    hashResolved(value, locals, dynamics, path).toString(36),
            };
            return ctx.applyRule(path + "/b", body, i, locals, frame);
        },
        hashFields: [
            ["name", MixAction.String],
            ["value", MixAction.ScopedChild],
            ["extend", MixAction.Boolean],
            ["body", MixAction.Child],
        ],
        describe: ({ name, value, extend, body }) =>
            (extend ? "&+" : "&") +
            name +
            "=" +
            describeCombinator(value) +
            "-" +
            describeCombinator(body),
    },

    // ---------------------------------------------------------------------------
    // seq / ssep

    sequence: {
        create: (
            s: GrammarCombinator<any, any> | undefined,
            ...n: GrammarCombinator<any, any>[]
        ) => ({
            items: n,
            separator: s,
        }),
        call(ctx, node, path, i, locals, dynamics) {
            const children: CSTNode<any>[] = [];
            const start = i;
            const { items, separator } = node,
                len = items.length;
            const currentCut = ctx.cutDepth();
            for (var j = 0; j < len; j++) {
                // try sep between items only
                if (j > 0 && separator) {
                    const sepThing = ctx.applyRule(
                        path + "/s",
                        separator,
                        i,
                        locals,
                        dynamics,
                    );
                    if (sepThing instanceof MatchFail) {
                        children.push(
                            new CSTNode(ctx.createSpan(i, i), null, [], true),
                        );
                    } else {
                        children.push(
                            new CSTNode(sepThing.span, null, [sepThing], true),
                        );
                        i = sepThing.span.end;
                    }
                }
                const child = items[j]!;
                const thisMatch = ctx.applyRule(
                    path + "/" + j,
                    child,
                    i,
                    locals,
                    dynamics,
                );
                if (thisMatch instanceof MatchFail) {
                    if (thisMatch.cut === Infinity) return thisMatch;
                    if (ctx.cutDepth() > currentCut) {
                        // we did another cut inside
                        // resync to the failed child (without breaking the outer grammar node)
                        if (ctx.committedDepth() > 1) return thisMatch;
                        const resumed = ctx.recoverChild(
                            path + "/" + j,
                            child,
                            i,
                            thisMatch,
                            children,
                            locals,
                            dynamics,
                        );
                        if (resumed === null) return thisMatch;
                        i = resumed;
                        continue;
                    }
                    return thisMatch;
                }
                children.push(thisMatch);
                i = thisMatch.span.end;
            }
            return new CSTNode(ctx.createSpan(start, i), null, children);
        },
        hashFields: [
            ["items", MixAction.Children],
            ["separator", MixAction.AuxChild],
        ],
        describe: ({ items, separator }) =>
            (separator ? describeCombinator(separator) + ".@(" : "(") +
            items.map((c) => describeCombinator(c)).join(" ") +
            ")",
    },

    // ---------------------------------------------------------------------------
    // alt

    alternatives: {
        create: (first: boolean, ...n: GrammarCombinator<any, any>[]) => ({
            options: n,
            first,
        }),
        call(ctx, node, path, i, locals, dynamics) {
            const { options: items, first } = node,
                len = items.length;
            const options: CSTNode<any>[] = [];
            var furthestFail: MatchFail | undefined;
            for (var j = 0; j < len; j++) {
                const depthBefore = ctx.cutDepth();
                const thisMatch = ctx.applyRule(
                    path + "/" + j,
                    items[j]!,
                    i,
                    locals,
                    dynamics,
                );
                if (thisMatch instanceof MatchFail) {
                    const childCut = thisMatch.cut;
                    const d = max(
                        childCut,
                        ctx.cutDepth() > depthBefore ? ctx.cutDepth() : 0,
                    );
                    if (d === 0) {
                        // track the furthest failure for better error messages
                        if (!furthestFail || thisMatch.i > furthestFail.i)
                            furthestFail = thisMatch;
                        continue;
                    }
                    ctx.consumeCut();
                    // propagate the child's cut depth unchanged; only decrement if the cut was from this level
                    const newCut = childCut > 0 ? childCut : d - 1;
                    return new MatchFail(
                        thisMatch.i,
                        newCut,
                        thisMatch.expected,
                    );
                }
                // A cut inside a successful alternative commits the choice:
                // return it now instead of letting a later, longer alternative win.
                // Alternatively, if we're intended to return the first one, do that.
                if (ctx.cutDepth() > depthBefore || first) return thisMatch;
                options.push(thisMatch);
            }
            return options.length < 1
                ? (furthestFail ??
                      new MatchFail(i, 0, node as GrammarCombinator<any, any>))
                : options.reduce((a, b) => (b.span.end > a.span.end ? b : a));
        },
        hashFields: [
            ["options", MixAction.Children],
            ["first", MixAction.Boolean],
        ],
        describe: ({ options, first }) =>
            options.length === 0
                ? "(|)"
                : "(" +
                  options
                      .map((c) => describeCombinator(c))
                      .join(first ? " || " : " | ") +
                  ")",
    },

    // ---------------------------------------------------------------------------
    // opt

    optional: {
        create: singleChild,
        call(ctx, { child }, path, i, locals, dynamics) {
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            // don't swallow a cut fail
            return cst instanceof MatchFail
                ? cst.cut > 0
                    ? cst
                    : new CSTNode(ctx.createSpan(i, i), null)
                : cst;
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => describeCombinator(child) + "?",
    },

    // ---------------------------------------------------------------------------
    // rep

    repeat: {
        // TODO: expose repeat_seq, it's implemented but not exposed by create + factories
        create: (r: boolean, n: GrammarCombinator<any, any>) => ({
            items: [n],
            required: r,
        }),
        call(ctx, { items: nodes, required }, path, i, locals, dynamics) {
            const start = i;
            const children: CSTNode<any>[] = [];
            const len = nodes.length;
            if (len > 0) {
                for (var count = 0; ; count++) {
                    if (i >= ctx.text.length) break;
                    const item = nodes[count % len]!;
                    const thisMatch = ctx.applyRule(
                        path + "/*",
                        item,
                        i,
                        locals,
                        dynamics,
                    );
                    if (thisMatch instanceof MatchFail) {
                        if (thisMatch.cut === Infinity) return thisMatch;
                        if (thisMatch.cut > 0) {
                            if (ctx.inCommittedScope()) {
                                // don't leak cuts, to allow resync
                                const end = max(thisMatch.i, i + 1);
                                children.push(
                                    ctx.errorNode(i, end, thisMatch.expected),
                                );
                                i = end;
                                continue;
                            }
                            // Not committed: panic-mode resync to next match.
                            const next = ctx.recover(
                                path + "/*",
                                item,
                                i,
                                thisMatch,
                                children,
                                locals,
                                dynamics,
                            );
                            if (next <= i) break; // nowhere left to go
                            i = next;
                            continue;
                        }
                        if (required && count < 1) return thisMatch;
                        // normal failure
                        break;
                    }
                    if (thisMatch.span.end === i) break; // no progress = stop
                    children.push(thisMatch);
                    i = thisMatch.span.end;
                }
            }
            return new CSTNode(ctx.createSpan(start, i), null, children);
        },
        hashFields: [
            ["items", MixAction.Children],
            ["required", MixAction.Boolean],
        ],
        describe: ({ items, required }) =>
            items.map((c) => describeCombinator(c)).join("") +
            (required ? "+" : "*"),
    },

    // ---------------------------------------------------------------------------
    // joined

    joined: {
        create: (
            j: GrammarCombinator<any, any>,
            n: GrammarCombinator<any, any>,
            r2: boolean,
            t: boolean,
        ) => ({ joiner: j, element: n, require2: r2, trailing: t }),
        call(
            ctx,
            { element: elemRule, joiner: sepRule, require2, trailing },
            path,
            i,
            locals,
            dynamics,
        ) {
            const start = i;
            const children: CSTNode<any>[] = [];
            const minimum = require2 ? 3 : 1; // children interleave elements and separators: two elements are 3 children
            var lastWasSep = false;
            for (;;) {
                if (i >= ctx.text.length) {
                    // at EOF don't allow a trailing separator unless trailing sep is allowed in general
                    if (children.length < minimum || (!trailing && lastWasSep))
                        return new MatchFail(i, 0, elemRule);
                    break;
                }
                const elem = ctx.applyRule(
                    path + "/e",
                    elemRule,
                    i,
                    locals,
                    dynamics,
                );
                if (elem instanceof MatchFail) {
                    if (elem.cut === Infinity) return elem;
                    if (elem.cut > 0) {
                        if (ctx.inCommittedScope()) {
                            // Inside a committed construct: keep it local.
                            const end = max(elem.i, i + 1);
                            children.push(ctx.errorNode(i, end, elem.expected));
                            i = end;
                            continue;
                        }
                        const next = ctx.recover(
                            path + "/e",
                            elemRule,
                            i,
                            elem,
                            children,
                            locals,
                            dynamics,
                        );
                        if (next <= i) break;
                        i = next;
                        continue;
                    }
                    if (children.length < minimum) return elem; // need at least one or two elements
                    // trailing sep is cut-fail
                    if (trailing) break;
                    return new MatchFail(elem.i, 1, elem.expected);
                }
                children.push(elem);
                i = elem.span.end;
                lastWasSep = false;
                const s = ctx.applyRule(
                    path + "/s",
                    sepRule,
                    i,
                    locals,
                    dynamics,
                );
                if (s instanceof MatchFail) {
                    if (s.cut === Infinity) return s;
                    if (s.cut > 0) {
                        if (ctx.inCommittedScope()) {
                            const end = max(s.i, i + 1);
                            children.push(ctx.errorNode(i, end, s.expected));
                            i = end;
                            continue;
                        }
                        const next = ctx.recover(
                            path + "/s",
                            sepRule,
                            i,
                            s,
                            children,
                            locals,
                            dynamics,
                        );
                        if (next <= i) break;
                        i = next;
                        continue;
                    }
                    if (children.length < minimum) return s; // need at least one or two elements
                    break; // no separator: done
                }
                if (s.span.end === i) break; // empty separator ?!?
                children.push(s);
                i = s.span.end;
                lastWasSep = true;
            }
            return new CSTNode(ctx.createSpan(start, i), null, children);
        },
        hashFields: [
            ["element", MixAction.Child],
            ["joiner", MixAction.AuxChild],
            ["require2", MixAction.Boolean],
            ["trailing", MixAction.Boolean],
        ],
        describe: ({ element, joiner, require2, trailing }) =>
            describeCombinator(joiner) +
            "." +
            describeCombinator(element) +
            "+" +
            (require2 ? "2" : "") +
            (trailing ? "t" : ""),
    },

    // ---------------------------------------------------------------------------
    // if

    if: {
        create: (
            c: GrammarCombinator<any, any>,
            t: GrammarCombinator<any, any>,
            f: GrammarCombinator<any, any>,
        ) => ({ condition: c, ifTrue: t, ifFalse: f }),
        call: (
            ctx,
            { condition, ifTrue, ifFalse },
            path,
            i,
            locals,
            dynamics,
        ) =>
            ctx.applyRule(
                path + "/c",
                condition,
                i,
                locals,
                dynamics,
            ) instanceof MatchFail
                ? ctx.applyRule(path + "/f", ifFalse, i, locals, dynamics)
                : ctx.applyRule(path + "/t", ifTrue, i, locals, dynamics),
        hashFields: [
            ["condition", MixAction.AuxChild],
            ["ifTrue", MixAction.Child],
            ["ifFalse", MixAction.Child],
        ],
        describe: ({ condition, ifTrue: if_true, ifFalse: if_false }) =>
            "(?(" +
            describeCombinator(condition) +
            ") " +
            describeCombinator(if_true) +
            " // " +
            describeCombinator(if_false) +
            ")",
    },

    // ---------------------------------------------------------------------------
    // tag

    tag: {
        create: (t: string, n: GrammarCombinator<any, any>) => ({
            tag: t,
            child: n,
        }),
        call(ctx, node, path, i, locals, dynamics) {
            const { tag: tagName, child } = node;
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            return cst instanceof MatchFail
                ? cst
                : new CSTNode(cst.span, null, [cst], false, tagName);
        },
        hashFields: [
            ["tag", MixAction.Tag],
            ["child", MixAction.Child],
        ],
        describe: ({ tag, child }) =>
            "#" + tag + "=" + describeCombinator(child),
    },

    // ---------------------------------------------------------------------------
    // cut

    cut: {
        create: (d = 1) => ({ depth: d }),
        call(ctx, { depth }, _, i) {
            ctx.applyCut(depth);
            return new CSTNode(ctx.createSpan(i, i), null, [], true);
        },
        hashFields: [["depth", MixAction.Number]],
        describe: ({ depth }) => "!" + depth,
    },

    // ---------------------------------------------------------------------------
    // lookahead

    lookahead: {
        create: (p: boolean, n: GrammarCombinator<any, any>) => ({
            positive: p,
            child: n,
        }),
        call(ctx, node, path, i, locals, dynamics) {
            const { positive, child } = node;
            const cst = ctx.applyRule(path + "/?", child, i, locals, dynamics);
            return cst instanceof MatchFail !== positive
                ? new CSTNode(ctx.createSpan(i, i), null, [], true)
                : new MatchFail(i, 0, node as GrammarCombinator<any, any>);
        },
        hashFields: [
            ["positive", MixAction.Boolean],
            ["child", MixAction.Child],
        ],
        describe: ({ positive, child }) =>
            "(?" + (positive ? "=" : "!") + describeCombinator(child) + ")",
    },

    // ---------------------------------------------------------------------------
    // nonempty / sameline

    nonempty: {
        create: singleChild,
        call(ctx, node, path, i, locals, dynamics) {
            const { child } = node;
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            return cst instanceof MatchFail
                ? cst
                : cst.span.end === i
                  ? new MatchFail(i, 0, node as GrammarCombinator<any, any>)
                  : cst;
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => "(+" + describeCombinator(child) + ")",
    },

    sameline: {
        create: singleChild,
        call(ctx, node, path, i, locals, dynamics) {
            const { child } = node;
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            return cst instanceof MatchFail
                ? cst
                : cst.span.startLine !== cst.span.endLine
                  ? new MatchFail(i, 0, node as GrammarCombinator<any, any>)
                  : cst;
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => "(=" + describeCombinator(child) + ")",
    },

    // ---------------------------------------------------------------------------
    // eps

    nothing: {
        create: () => {},
        call: (ctx, __, ___, i) => new CSTNode(ctx.createSpan(i, i), null),
        hashFields: [],
        describe: () => "()",
    },

    // ---------------------------------------------------------------------------
    // try

    try: {
        create: singleChild,
        call(ctx, { child }, path, i, locals, dynamics) {
            // Speculative parse: if node fails, hide the cuts
            const savedCuts = ctx.snapshotCuts();
            const cst = ctx.applyRule(path + "/", child, i, locals, dynamics);
            if (cst instanceof MatchFail) {
                ctx.restoreCuts(savedCuts);
                return new MatchFail(cst.i, 0, cst.expected);
            }
            return cst;
        },
        hashFields: [["child", MixAction.Child]],
        describe: ({ child }) => "[" + describeCombinator(child) + "]",
    },

    // ---------------------------------------------------------------------------
    // die

    die: {
        create: (m: string) => ({ message: m }),
        call: (_, node, __, i) =>
            new MatchFail(i, Infinity, node as GrammarCombinator<any, any>),
        hashFields: [["message", MixAction.String]],
        describe: ({ message }) => "^" + stringify(message),
    },

    // ---------------------------------------------------------------------------
} satisfies OpDefs;

/**
 * Renders a combinator in a compact PEG-like notation, via its operation's
 * `describe` in {@link opDefs}; for debugging grammars.
 */
export const describeCombinator = (
    node: GrammarCombinator<any, any>,
): string => {
    // The lookup goes through the loose def type: indexing the table by a
    // not-yet-narrowed op cannot be typed precisely (the precise def for an
    // op is keyed by that op's own node shape).
    return (opDefs[node.op] as GrammarOpDef<any>).describe(node);
};
