/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export interface BackupMetadata {
    version: number;
    createdAt: number;
    dbName: string;
    tables: string[];
    recordCounts: Map<string, number>;
    checksum: string;
}
export interface BackupOptions {
    compressionLevel?: number;
    includeSchema?: boolean;
    includeData?: boolean;
}
export declare class BackupManager {
    private rootPath;
    constructor(rootPath: string);
    createBackup(dbName: string, options?: BackupOptions): Promise<string>;
    restoreBackup(backupPath: string, targetDbName?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    listBackups(): {
        name: string;
        path: string;
        size: number;
        created: number;
    }[];
    deleteBackup(backupPath: string): boolean;
    private xorEncrypt;
    private xorDecrypt;
    private computeChecksum;
}
//# sourceMappingURL=backup-manager.d.ts.map