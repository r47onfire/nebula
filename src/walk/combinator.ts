import { javaHash } from "@r47onfire/game-math";
import { deflateSync, strToU8 } from "fflate";
import { isArray } from "lib0/array";
import { imul } from "lib0/math";
import {
    Dynamics,
    GrammarCombinator,
    Locals,
    MixAction,
    opDefs,
} from "../combinator";

export interface CombinatorWalker<T, E, R extends string, P extends string> {
    /**
     * Turn one raw scalar value into a T. Called once per scalar, and once per
     * element for scalar-array fields.
     */
    leaf(
        node: GrammarCombinator<R, P>,
        field: string,
        action: MixAction,
        value: unknown,
        env: E,
    ): T;
    /**
     * Fold one node from its folded fields: child fields carry the child's fold
     * result, array fields appear as repeated entries in order.
     */
    fold(
        fields: readonly (readonly [
            field: string,
            action: MixAction,
            value: T,
        ])[],
        node: GrammarCombinator<R, P>,
        env: E,
    ): T; /** Substitute a node (and its environment) before folding it -- references. */
    resolve?(
        node: GrammarCombinator<R, P>,
        env: E,
    ): { node: GrammarCombinator<R, P>; env: E } | undefined;
    /** Adjust the environment for one child field -- scope-introducing nodes. */
    childEnv?(
        node: GrammarCombinator<R, P>,
        field: string,
        action: MixAction,
        env: E,
    ): E;
    /**
     * A finished value for this node, if already known: cancels the walk below
     * it.
     */
    precomputed?(node: GrammarCombinator<R, P>, env: E): T | undefined;
    /** Record a node's folded value for future `precomputed` hits. */
    memoize?(node: GrammarCombinator<R, P>, value: T, env: E): void;
}

export const walkCombinator = <T, E, R extends string, P extends string>(
    g: GrammarCombinator<R, P>,
    env: E,
    walker: CombinatorWalker<T, E, R, P>,
): T => {
    const pre = walker.precomputed?.(g, env);
    if (pre !== undefined) return pre;
    const sub = walker.resolve?.(g, env);
    if (sub !== undefined) return walkCombinator(sub.node, sub.env, walker);
    const fields: (readonly [string, MixAction, T])[] = [];
    for (let { 0: field, 1: action } of opDefs[g.op].hashFields) {
        const value = (g as any)[field] as unknown;
        if (value === undefined) continue;
        switch (action) {
            case MixAction.Child:
            case MixAction.AuxChild:
            case MixAction.ScopedChild:
                fields.push([
                    field,
                    action,
                    walkCombinator(
                        value as GrammarCombinator<R, P>,
                        walker.childEnv?.(g, field, action, env) ?? env,
                        walker,
                    ),
                ]);
                break;
            case MixAction.Children:
                for (let c of value as GrammarCombinator<R, P>[])
                    fields.push([
                        field,
                        action,
                        walkCombinator(
                            c,
                            walker.childEnv?.(g, field, action, env) ?? env,
                            walker,
                        ),
                    ]);
                break;
            default: // scalar actions: String, Number, Boolean, Text, StringArray
                if (isArray(value)) {
                    for (const el of value)
                        fields.push([
                            field,
                            action,
                            walker.leaf(g, field, MixAction.String, el, env),
                        ]);
                } else {
                    fields.push([
                        field,
                        action,
                        walker.leaf(g, field, action, value, env),
                    ]);
                }
        }
    }
    const result = walker.fold(fields, g, env);
    walker.memoize?.(g, result, env);
    return result;
};

const basicHashMap = new WeakMap<GrammarCombinator<any, any>, number>();
const basicHash: CombinatorWalker<number, void, any, any> = {
    leaf(_node, _field, action, value) {
        switch (action) {
            case MixAction.String:
            case MixAction.Text:
            case MixAction.Tag:
                return javaHash(value as string);
            case MixAction.Number:
                return value as number;
            case MixAction.Boolean:
                return value ? 0xdeadbeef : 0xc0ffee99;
            default:
                throw new Error("unknown action " + MixAction[action]);
        }
    },
    fold(fields, node) {
        let h = javaHash(node.op);
        for (let { 1: action, 2: value } of fields)
            h =
                (imul(h, action === MixAction.AuxChild ? 37 : 31) + value) >>>
                0;
        return h;
    },
    precomputed: (node) => basicHashMap.get(node),
    memoize: (node, value) => basicHashMap.set(node, value),
};

/**
 * A hash of a combinator tree, driven by the `hashFields` of each operation's
 * definition: like trees hash alike. Since there is no resolver, this is a
 * purely structural hash and is cached, so hashing a tree costs one walk,
 * ever.
 */
export const hashCombinator = (g: GrammarCombinator<any, any>): number => {
    return walkCombinator(g, undefined, basicHash);
};

type ResolveEnv<P extends string> = readonly [
    locals: Locals<P>,
    dynamics: Dynamics,
];

/**
 * The canonical serialization of a combinator tree with its parameter
 * references resolved: `param` nodes contribute the serialization of the
 * argument they name (resolved in the lexical scope), `ambient` nodes the
 * serialization of the dynamic binding they name (resolved in the dynamic scope
 * captured by that binding, so a binding's value never depends on itself), and
 * `bind` nodes serialize their body under the dynamic scope the bind creates.
 * Nothing is cached, since the result depends on the scopes, not just the
 * tree.
 *
 * The serialization exactly encodes the fields that feed the combinator hash
 * (see `hashFields` on the operation definitions), in definition order, so it
 * can (in theory) be unparsed back into the resolved tree it came from.
 * Currently, the format is undocumented and there is no parsing function, but
 * there is also really no need to be parsing it.
 *
 * @throws If the grammar is invalid (there is a lexical or ambient parameter
 *   that isn't bound and has no default)
 */
export const serializeResolved = <R extends string, P extends string>(
    g: GrammarCombinator<R, P>,
    locals: Locals<P>,
    dynamics: Dynamics,
    path: string,
): string =>
    encodeKeyString(
        JSON.stringify(
            walkCombinator(g, [locals, dynamics] as ResolveEnv<P>, {
                leaf: (_node, _field, _action, value) => value,
                fold(fields, node) {
                    const out: Record<string, unknown> = { op: node.op };
                    for (const { 0: field, 1: action, 2: value } of fields) {
                        if (
                            action === MixAction.Children ||
                            action === MixAction.StringArray
                        ) {
                            const arr = out[field] as unknown[] | undefined;
                            if (arr) arr.push(value);
                            else out[field] = [value];
                        } else if (field in out) {
                            // a repeated scalar entry: a text field holding an
                            // array of strings
                            const prev = out[field];
                            if (isArray(prev)) prev.push(value);
                            else out[field] = [prev, value];
                        } else out[field] = value;
                    }
                    return out;
                },
                resolve(node, env) {
                    if (node.op === "param") {
                        for (let frame = env[0]; frame; frame = frame.next) {
                            const binding = frame.bindings[node.name];
                            if (binding)
                                return {
                                    node: binding.node,
                                    env: [binding.locals, env[1]] as const,
                                };
                        }
                        if (node.default) return { node: node.default, env };
                        throw new Error(
                            "unbound rule parameter " +
                                node.name +
                                " at " +
                                path,
                        );
                    }
                    if (node.op === "ambient") {
                        for (let dyn = env[1]; dyn; dyn = dyn.next) {
                            if (dyn.name === node.name)
                                return {
                                    node: dyn.node,
                                    env: [dyn.locals, dyn.next] as const,
                                };
                        }
                        if (node.default) return { node: node.default, env };
                        throw new Error(
                            "unbound dynamic parameter " +
                                node.name +
                                " at " +
                                path,
                        );
                    }
                    return undefined;
                },
                childEnv(node, _field, action, env) {
                    if (action === MixAction.ScopedChild) {
                        // only bind's body is ScopedChild: it folds under the
                        // dynamic scope the bind creates
                        const { name, value } = node as typeof node & {
                            name: string;
                            value: GrammarCombinator<R, P>;
                        };
                        return [
                            env[0],
                            {
                                name,
                                node: value,
                                locals: env[0],
                                dynamics: env[1],
                                next: env[1],
                                key: "",
                            },
                        ] as const;
                    }
                    return env;
                },
            }),
        ),
    );

/**
 * Smallest JSON text worth deflating: below this, a deflate stream's own
 * overhead cannot pay for itself.
 */
const DEFLATE_FLOOR = 1000;

const encodeKeyString = (json: string): string => {
    const quoted = JSON.stringify(json);
    if (json.length < DEFLATE_FLOOR) return quoted;
    const packed = deflateSync(strToU8(json)).toBase64();
    return packed.length + 1 < quoted.length ? "!" + packed : quoted;
};
