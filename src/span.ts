import { freeze } from "lib0/object";

/** Source location information for a token. Also immutable at runtime. */
export class Span {
    constructor(
        /** URL uniquely identifying the source that this span is from. */
        public readonly file: Readonly<URL>,
        /** Source index at which this span starts. (not line or column.) */
        public readonly begin: number,
        /** Source index at which this span ends. */
        public readonly end: number,
        public readonly startLine: number,
        public readonly startCol: number,
        public readonly endLine: number,
        public readonly endCol: number,
    ) {
        freeze(this);
    }
}

/** Whether two (possibly undefined) {@link Location}s denote the same place. */
export const locationsEqual = (
    location1: Span | undefined,
    location2: Span | undefined,
) => {
    if (!location1 || !location2) return location1 === location2;
    return (
        location1.file.href === location2.file.href &&
        location1.begin === location2.begin &&
        location1.end === location2.end
    );
};
