/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export interface PooledConnection {
    id: number;
    inUse: boolean;
    lastUsed: number;
    createdAt: number;
}
export declare class ConnectionPool {
    private connections;
    private maxSize;
    private minSize;
    private acquireTimeout;
    private nextId;
    constructor(maxSize?: number, minSize?: number, acquireTimeout?: number);
    private createConnection;
    acquire(): Promise<PooledConnection | null>;
    release(conn: PooledConnection): void;
    private delay;
    close(): void;
    getStats(): {
        active: number;
        idle: number;
        total: number;
    };
}
export declare class Transaction {
    private pool;
    private conn;
    private started;
    private committed;
    private rolledBack;
    private operations;
    constructor(pool: ConnectionPool);
    begin(): Promise<void>;
    addOperation(op: TransactionOperation): void;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    isActive(): boolean;
    isCommitted(): boolean;
    isRolledBack(): boolean;
}
export interface TransactionOperation {
    execute(): Promise<void>;
    rollback(): Promise<void>;
}
export declare function createTransaction(pool: ConnectionPool): Transaction;
//# sourceMappingURL=connection-pool.d.ts.map