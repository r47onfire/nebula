/** Source location information for a token. */
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
    ) {}
}
