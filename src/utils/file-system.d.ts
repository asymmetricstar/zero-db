/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export declare class FileSystem {
    private filePath;
    private cachedContent;
    private cachedCrc;
    private cachedRecords;
    private readonly LARGE_FILE_THRESHOLD;
    constructor(filePath: string);
    exists(): boolean;
    readContent(): string;
    readRecords(): Map<number, string>;
    writeContent(content: string): void;
    appendContent(append: string): void;
    updateRecords(linesToUpdate: Set<number>, fieldName: string, newValue: string): void;
    removeRecords(linesToRemove: Set<number>): void;
    invalidate(): void;
    getCrc(): string | null;
    isDirty(): boolean;
    private countRecords;
    private isLargeFile;
}
//# sourceMappingURL=file-system.d.ts.map