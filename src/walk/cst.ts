import { javaHash } from "@r47onfire/game-math";
import { imul } from "lib0/math";
import type { condenseCST } from "../compile";
import { CSTNode } from "../cst";

const namedChildrenCache = new WeakMap<CSTNode<any>, readonly CSTNode<any>[]>();

/**
 * The children `node` would have if it were condensed (see {@link condenseCST}),
 * computed from the raw tree without condensing it: ignored children are
 * dropped, unnamed containers dissolve into their own such children, and named
 * nodes, text leaves, and error nodes are kept as they are -- the original
 * nodes, not condensed rebuilds.
 *
 * Nodes are immutable, so the result is cached per node in a WeakMap and the
 * same array is returned on every call; do not mutate it.
 */
export const namedChildren = <T>(node: CSTNode<T>): readonly CSTNode<T>[] =>
    namedChildrenCache.getOrInsertComputed(node, () => {
        const out: CSTNode<T>[] = [];
        const collect = (n: CSTNode<T>): void => {
            for (const child of n.children) {
                if (child.ignored) continue;
                if (
                    child.errorExpected !== undefined ||
                    child.type !== null ||
                    child.text !== null
                )
                    out.push(child);
                // an unnamed container dissolves into its parent
                else collect(child);
            }
        };
        collect(node);
        return out;
    });

const hashCache = new WeakMap<CSTNode<any>, number>();

/**
 * A structural hash of a CST. Ignores {@link CSTNode.span|span} and
 * {@link CSTNode.value|value} since the span can differ if the same text is
 * parsed twice in two different places, and the value is a mutable memoization
 * helper.
 *
 * The result is cached, so hashing a tree costs one walk, ever. Structural
 * edits do not happen in place -- a traversal rebuilds the nodes above an edit,
 * and rebuilt nodes start with no cached hash.
 */
export const hashNode = <T>(node: CSTNode<T>): number =>
    hashCache.getOrInsertComputed(node, () => {
        let h = node.type === null ? 0xdeadbeef : javaHash(node.type as string);
        if (node.text !== null) h = (imul(h, 31) + javaHash(node.text)) >>> 0;
        if (node.ignored) h = (imul(h, 31) + 0xc0ffee99) >>> 0;
        for (const child of node.children)
            h = (imul(h, 31) + hashNode(child)) >>> 0;
        return h;
    });

/** One node of a {@link traverseCST} walk, with the means to steer it. */
export interface CSTPath<T> {
    /** The node being visited. */
    readonly node: CSTNode<T>;
    /** The node's parent, or null when visiting the root. */
    readonly parent: CSTNode<T> | null;
    /** The node's index within its parent's children (-1 for the root). */
    readonly index: number;
    /** Do not descend into this node's children (or its replacements). */
    skip(): void;
    /** Stop the whole traversal; nothing further is visited. */
    stop(): void;
    /**
     * Replace this node with the given nodes in the resulting tree -- no nodes
     * removes it. The replacements are themselves visited in turn, unless
     * {@link CSTPath.skip} was also called. The root may only be replaced with
     * exactly one node. If called more than once, the last call wins.
     */
    replaceWith(...nodes: CSTNode<T>[]): void;
    /** Remove this node from the resulting tree. Shorthand for `replaceWith()`. */
    remove(): void;
}

/**
 * A {@link traverseCST} visitor: either one function called for every node, or
 * a table from node type to the function for nodes of that type, with a `"*"`
 * entry (if any) called for the nodes no other entry claims -- text leaves and
 * unnamed containers can only be reached through `"*"`. The functions run
 * pre-order: a node is visited before its children.
 */
export type CSTVisitor<T> =
    | ((path: CSTPath<T>) => void)
    | Readonly<Record<string, (path: CSTPath<T>) => void>>;

/**
 * Walk a CST the way @babel/traverse walks a Babel AST: every node -- named,
 * unnamed, ignored, and leaves alike -- is visited pre-order, and the visitor
 * steers the walk through the {@link CSTPath} it is handed (skip a subtree, stop
 * the walk, replace or remove nodes).
 *
 * The walk is non-mutating. It returns the tree with every replacement applied:
 * a subtree nothing replaced in is returned as the very same objects, while a
 * node with a changed descendant is rebuilt -- same span, type, and flags, new
 * children, and neither `value` nor a cached hash carried over, since both may
 * have depended on the old children. Replacements made before a
 * {@link CSTPath.stop} still apply; the rest of the tree is returned as it
 * was.
 */
export const traverseCST = <T>(
    root: CSTNode<T>,
    visitor: CSTVisitor<T>,
): CSTNode<T> => {
    const state = { stopped: false };

    const visitFn =
        typeof visitor === "function"
            ? visitor
            : (path: CSTPath<T>): void => {
                  const table = visitor as Readonly<
                      Record<string, (path: CSTPath<T>) => void>
                  >;
                  const fn =
                      path.node.type !== null
                          ? table[path.node.type as string]
                          : undefined;
                  (fn ?? table["*"])?.(path);
              };

    // Visits one node and returns the nodes that now occupy its slot: the
    // node itself if nothing under it changed, a rebuilt node if something
    // did, or the (visited) replacements if it replaced itself.
    const visit = (
        node: CSTNode<T>,
        parent: CSTNode<T> | null,
        index: number,
    ): CSTNode<T>[] => {
        let skipped = false;
        let replacement: CSTNode<T>[] | null = null;
        const path: CSTPath<T> = {
            node,
            parent,
            index,
            skip() {
                skipped = true;
            },
            stop() {
                state.stopped = true;
            },
            replaceWith(...nodes: CSTNode<T>[]) {
                replacement = nodes;
            },
            remove() {
                replacement = [];
            },
        };
        visitFn(path);
        if (replacement !== null) {
            const nodes: CSTNode<T>[] = replacement;
            if (parent === null && nodes.length !== 1)
                throw new Error(
                    "traverseCST: the root can only be replaced with exactly one node",
                );
            if (skipped || state.stopped) return nodes;
            const out: CSTNode<T>[] = [];
            for (let i = 0; i < nodes.length; i++) {
                if (state.stopped) {
                    out.push(...nodes.slice(i));
                    break;
                }
                out.push(...visit(nodes[i]!, parent, index + out.length));
            }
            return out;
        }
        if (skipped || state.stopped) return [node];
        let changed = false;
        const newChildren: CSTNode<T>[] = [];
        for (let i = 0; i < node.children.length; i++) {
            if (state.stopped) {
                for (; i < node.children.length; i++)
                    newChildren.push(node.children[i]!);
                break;
            }
            const child = node.children[i]!;
            const results = visit(child, node, i);
            if (results.length !== 1 || results[0] !== child) changed = true;
            newChildren.push(...results);
        }
        if (!changed) return [node];
        return [
            new CSTNode(
                node.span,
                node.type,
                newChildren,
                node.ignored,
                node.tag,
                node.text,
                node.errorExpected,
            ),
        ];
    };

    const results = visit(root, null, -1);
    if (results.length !== 1)
        throw new Error(
            "traverseCST: the root can only be replaced with exactly one node",
        );
    return results[0]!;
};
