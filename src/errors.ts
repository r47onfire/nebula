/**
 * @file Error formatting: renders a message together with the offending source
 *   line and a caret span under it.
 */

import { max } from "lib0/math";
import { Span } from "./span";

/**
 * Formats `message` as `file:line:col: message`, followed by the source line
 * containing `span.begin` and a row of `^` under the span `begin..end` (clipped
 * to that line, with a "..." suffix if the span runs past it).
 *
 * `getSource` supplies the text of a source file by URL; if it returns an empty
 * string, only the header line is produced.
 */
export const formatTrace = (
    span: Span,
    message: string,
    getSource: (url: URL) => string,
): string => {
    const { startLine, endLine, startCol, endCol, file, begin, end } = span;
    const src = getSource(file);
    var lineInfo = "";
    if (src) {
        const lines = src.split("\n");
        if (startLine < lines.length) {
            const relevantLine = lines[startLine]!;
            const lineNumberString = startLine + 1 + "";
            var spanLength = end - begin;
            var suffix = "";
            if (endLine !== startLine) {
                spanLength = relevantLine.length - endCol;
                suffix = "...";
            }
            spanLength = max(spanLength, 1);
            lineInfo = `\n${lineNumberString} | ${relevantLine}\n${" ".repeat(lineNumberString.length)} | ${" ".repeat(startCol) + "^".repeat(spanLength) + suffix}`;
        }
    }
    return `${file.href}:${startLine + 1}:${startCol + 1}: ${message}${lineInfo}`;
};
