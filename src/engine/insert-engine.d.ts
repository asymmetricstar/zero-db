/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { DataManager, FieldSchema } from '../managers/data-manager';
export declare class InsertEngine {
    private dataManager;
    constructor(dataManager: DataManager);
    insert(dbName: string, tableName: string, records: Record<string, string>[], fieldFileNames: Map<string, string>, schemas?: Map<string, FieldSchema>): Promise<{
        success: boolean;
        lineNumbers: number[];
        errors: string[];
    }>;
    private insertSequential;
    private insertBatch;
    private insertHybrid;
    private insertWorker;
    private insertStream;
    private processChunk;
}
//# sourceMappingURL=insert-engine.d.ts.map