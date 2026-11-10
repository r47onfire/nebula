import { CSTNode } from "./cst";

/**
 * Condense a CST as much as possible, preserving metadata spans:
 *
 * - Ignored children are removed
 * - Unnamed container nodes are merged into their parent
 * - Named nodes, text leaves, and error nodes stay as they are
 *
 * The root is always a named node since a parse always starts at a named rule.
 */
export const condenseCST = (cst: CSTNode): CSTNode => {
    const condensedChildren = (node: CSTNode): CSTNode[] =>
        (node.children ?? [])
            .filter((child) => !child.ignored)
            .flatMap(condense);
    const condense = (node: CSTNode): CSTNode[] => {
        // error nodes stay whole, their children unexamined, as in toAST
        if (node.errorExpected !== undefined) return [node];
        // named nodes survive, with their children condensed
        if (node.type !== undefined)
            return [
                node.children === undefined
                    ? node
                    : { ...node, children: condensedChildren(node) },
            ];
        // unnamed containers dissolve into their parent
        if (node.children !== undefined) return condensedChildren(node);
        // text leaves survive as they are
        return [node];
    };
    return condense(cst)[0]!;
};

/**
 * Hooks matching the rule name to handler type. T is defined by the specific
 * compile driver that you use (for {@link syncCompile}, it is a Javascript
 * function).
 *
 * The mapping is used by the handler for any purpose, but is usually used to
 * map variant to implementation (e.g "+" to a plus builtin and "-" to a minus
 * builtin.)
 */
export type CompilerTable<T> = Record<
    string,
    [fn: T, mapping?: Record<string, any>]
>;

/** Result from a single compile step. */
export interface CompileBuilder<T> {
    /** The template value of AST. */
    val: T;
    /**
     * For all the value-path pairs in `tbc`, the CST node will be compiled, and
     * then inserted into the `val` using {@link assignPath}.
     */
    tbc?: [CSTNode, PropertyKey[]][];
    /**
     * If `post` is set then the result, after assembling, will be passed back
     * into the `post` entry in the table (as a single node).
     */
    post?: string | null;
}

export const syncCompile = <T>(
    node: CSTNode,
    tab: CompilerTable<
        (
            items: any,
            table: Record<string, any> | undefined,
            node: CSTNode,
        ) => CompileBuilder<T>
    >,
    wrap: (compiled: any, node: CSTNode) => any,
    handleError: (message: any) => any,
): any => {
    const entry = tab[node.type!];
    var tbc, val, post;
    if (!entry)
        val = handleError(
            `don't know how to compile ${JSON.stringify(node.type)} node`,
        );
    else
        try {
            ({ tbc, val, post } = entry[0](node.children!, entry[1], node));
            if (tbc)
                for (var [node2, path] of tbc) {
                    val = assignPath(
                        val,
                        syncCompile(node2, tab, wrap, handleError),
                        path,
                    );
                }
            if (post) {
                val = syncCompile(
                    { type: post, children: val } as any as CSTNode,
                    tab,
                    (x) => x,
                    handleError,
                );
            }
            // console.log("post-compile", node.type, val);
        } catch (e) {
            val = handleError(e);
        }
    return wrap(val, node);
};

/**
 * The type of the value found at the end of path `P` in `T`. An empty path
 * gives `T` itself. A path that is not a fixed-length tuple cannot be resolved
 * statically and gives `any`.
 */
export type PathValue<
    T,
    P extends readonly PropertyKey[],
> = number extends P["length"]
    ? any
    : P extends readonly [infer H, ...infer R extends PropertyKey[]]
      ? H extends keyof T
          ? PathValue<T[H], R>
          : never
      : T;

/**
 * `P` itself if every element of `P` is a key of the value the previous
 * elements lead to in `T`; `never` as soon as one step is not. An empty path is
 * valid. A path that is not a fixed-length tuple cannot be checked statically
 * and passes through unchanged.
 */
export type ValidPath<
    T,
    P extends readonly PropertyKey[],
> = number extends P["length"]
    ? P
    : P extends readonly [infer H, ...infer R extends PropertyKey[]]
      ? H extends keyof T
          ? readonly [H, ...ValidPath<T[H], R>]
          : never
      : readonly [];

/**
 * Set `obj` into `val` at the location named by `path`, possibly mutating `val`
 * in place, and return the new `val`.
 *
 * Every element of `path` but the last indexes into an existing value; the last
 * names the property that is assigned. Nothing is created along the way, so the
 * intermediate containers must already exist. An empty path assigns nothing and
 * simply returns `obj` in place of the whole value.
 *
 * This is the write half of {@link CompileBuilder.tbc}: each entry pairs a child
 * node with the path its compiled value belongs at in the handler's template.
 */
export const assignPath = <T, const P extends readonly PropertyKey[]>(
    val: T,
    obj: PathValue<T, P>,
    path: P & ValidPath<T, P>,
): T => {
    var x: any = val;
    if (path.length > 0) {
        for (var i = 0; i < path.length - 1; i++) {
            x = x[path[i]!];
        }
        // console.log("before set", x, path[i], obj);
        x[path[i]!] = obj;
        // console.log("after set", x);
    } else val = obj;
    return val;
};
