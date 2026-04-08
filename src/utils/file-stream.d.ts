/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export declare class FileStreamReader {
    private static readonly BUFFER_SIZE;
    static readLineByLine(filePath: string, callback: (line: string, lineIndex: number) => boolean | void): void;
    static readLinesInRange(filePath: string, startLine: number, endLine: number): string[];
    static readSpecificLines(filePath: string, lineNumbers: number[]): Map<number, string>;
    static getLineCount(filePath: string): number;
}
//# sourceMappingURL=file-stream.d.ts.map