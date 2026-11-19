import { describe, expect, test } from "bun:test";
import { CSTNode, Span, hashNode, namedChildren, traverseCST } from "../src";
import { condenseCST } from "../src/compile";

const span = new Span(new URL("test:"), 0, 0, 0, 0, 0, 0);
const leaf = (text: string) =>
    new CSTNode<any>(span, null, [], false, null, text);
const unnamed = (children: CSTNode<any>[], ignored = false) =>
    new CSTNode<any>(span, null, children, ignored, null, null);
const node = (type: string, children: CSTNode<any>[] = [], ignored = false) =>
    new CSTNode<any>(span, type, children, ignored, null, null);

/** Root(a(1), " ", container(b(2))) */
const sample = () =>
    node("root", [
        node("a", [leaf("1")]),
        leaf(" "),
        unnamed([node("b", [leaf("2")])]),
    ]);

const label = (n: CSTNode<any>) => n.type ?? JSON.stringify(n.text);

describe("hashNode", () => {
    test("like trees hash alike, and the hash is cached on the node", () => {
        const a = sample();
        const b = sample();
        expect(hashNode(a)).toBe(hashNode(b));
    });

    test("structure changes change the hash", () => {
        const base = hashNode(sample());
        expect(hashNode(node("root", [leaf("x")]))).not.toBe(base);
        // child order matters
        const ab = node("r", [node("a"), node("b")]);
        const ba = node("r", [node("b"), node("a")]);
        expect(hashNode(ab)).not.toBe(hashNode(ba));
        // the ignored flag is part of the hash
        expect(hashNode(node("x", [], true))).not.toBe(
            hashNode(node("x", [], false)),
        );
    });
});

describe("namedChildren", () => {
    test("matches the children condensing would produce", () => {
        const tricky = node("root", [
            node("a", [leaf("1")]),
            node("ws", [], true),
            unnamed([leaf("x"), node("b")]),
            unnamed([node("hidden")], true),
        ]);
        // ignored children drop out (an ignored container takes its
        // children with it), unnamed containers dissolve, and named
        // nodes and text leaves stay
        expect(namedChildren(tricky).map(label)).toEqual(["a", '"x"', "b"]);
        expect(namedChildren(tricky).map(label)).toEqual(
            condenseCST(tricky).children.map(label),
        );
        expect(namedChildren(sample()).map(label)).toEqual(["a", '" "', "b"]);
    });

    test("returns the original nodes, and the same array on every call", () => {
        const root = sample();
        const children = namedChildren(root);
        expect(children[0]).toBe(root.children[0]);
        expect(children[2]).toBe(root.children[2]!.children[0]);
        expect(namedChildren(root)).toBe(children);
    });
});

describe("traverseCST", () => {
    test("visits every node pre-order", () => {
        const seen: string[] = [];
        traverseCST(sample(), (p) => {
            seen.push(label(p.node));
        });
        expect(seen).toEqual(["root", "a", '"1"', '" "', "null", "b", '"2"']);
    });

    test("a keyed visitor fires by type, with * for the rest", () => {
        const seen: string[] = [];
        traverseCST(sample(), {
            a: () => seen.push("A"),
            "*": (p) => seen.push(label(p.node)),
        });
        expect(seen).toEqual(["root", "A", '"1"', '" "', "null", "b", '"2"']);
    });

    test("skip() prunes a subtree", () => {
        const seen: string[] = [];
        traverseCST(sample(), (p) => {
            seen.push(label(p.node));
            if (p.node.type === "a") p.skip();
        });
        expect(seen).toEqual(["root", "a", '" "', "null", "b", '"2"']);
    });

    test("stop() ends the walk", () => {
        const seen: string[] = [];
        traverseCST(sample(), (p) => {
            seen.push(label(p.node));
            if (p.node.type === "a") p.stop();
        });
        expect(seen).toEqual(["root", "a"]);
    });

    test("a walk that replaces nothing returns the same tree", () => {
        const root = sample();
        expect(traverseCST(root, () => {})).toBe(root);
    });

    test("replaceWith() rebuilds the path to the replacement, nothing else", () => {
        const root = sample();
        const seen: string[] = [];
        const out = traverseCST(root, (p) => {
            seen.push(label(p.node));
            if (p.node.type === "a")
                p.replaceWith(node("x", [leaf("9")]), node("y"));
        });
        expect(out).not.toBe(root);
        expect(out.children.map(label)).toEqual(["x", "y", '" "', "null"]);
        // the original tree is untouched, and the untouched subtrees of
        // the result are the original objects
        expect(root.children.map(label)).toEqual(["a", '" "', "null"]);
        expect(out.children[2]).toBe(root.children[1]);
        expect(out.children[3]).toBe(root.children[2]);
        // the replacements were visited in turn
        expect(seen).toEqual([
            "root",
            "a",
            "x",
            '"9"',
            "y",
            '" "',
            "null",
            "b",
            '"2"',
        ]);
    });

    test("remove() drops a node from the resulting tree", () => {
        const root = node("root", [
            node("keep"),
            node("comment", [leaf("note")], true),
            node("keep2"),
        ]);
        const out = traverseCST(root, (p) => {
            if (p.node.type === "comment") p.remove();
        });
        expect(out.children.map(label)).toEqual(["keep", "keep2"]);
        expect(root.children).toHaveLength(3);
    });

    test("replacements made before stop() still apply", () => {
        const out = traverseCST(sample(), (p) => {
            if (p.node.type === "a") {
                p.replaceWith(node("z"));
                p.stop();
            }
        });
        expect(out.children.map(label)).toEqual(["z", '" "', "null"]);
    });

    test("the root can be replaced with a single node, which is returned", () => {
        const fresh = node("fresh");
        const out = traverseCST(node("stale"), (p) => {
            if (p.node.type === "stale") p.replaceWith(fresh);
        });
        expect(out).toBe(fresh);
        expect(() =>
            traverseCST(node("stale"), (p) => {
                p.replaceWith(node("a"), node("b"));
            }),
        ).toThrow("exactly one node");
    });
});

let readonly: TypeError;
try {
    // @ts-expect-error
    ({ get x() {} }).x = 1;
} catch (e) {
    readonly = e as TypeError;
}

describe("immutable at runtime", () => {
    test("node is immutable", () => {
        const node = sample();
        expect(() => {
            // @ts-expect-error
            node.type = "foo";
        }).toThrowError(readonly);
    });
    test("children is immutable", () => {
        const node = sample();
        expect(() => {
            // @ts-expect-error
            node.children.push(sample());
        }).toThrowError(readonly);
    });
});
