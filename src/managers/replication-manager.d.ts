/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export interface ReplicationConfig {
    enabled: boolean;
    mode: 'master' | 'slave';
    syncInterval: number;
    targetPath?: string;
}
export interface SyncRecord {
    timestamp: number;
    operation: 'insert' | 'update' | 'delete';
    dbName: string;
    tableName: string;
    data: any;
    lineNumber?: number;
}
export declare class ReplicationManager {
    private rootPath;
    private config;
    private syncInterval;
    private pendingSync;
    private WAL_PATH;
    constructor(rootPath: string, config: ReplicationConfig);
    start(): void;
    stop(): void;
    logOperation(op: SyncRecord): void;
    syncToSlave(): Promise<void>;
    private applyOperationToSlave;
    getStatus(): {
        pending: number;
        enabled: boolean;
        mode: string;
    };
    purgeWAL(beforeTimestamp: number): void;
}
export declare function createReplicationManager(rootPath: string, config: ReplicationConfig): ReplicationManager;
//# sourceMappingURL=replication-manager.d.ts.map