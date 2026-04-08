"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.ConnectionPool = void 0;
exports.createTransaction = createTransaction;
const event_manager_1 = require("../utils/event-manager");
class ConnectionPool {
    constructor(maxSize = 10, minSize = 2, acquireTimeout = 5000) {
        this.connections = [];
        this.nextId = 1;
        this.maxSize = maxSize;
        this.minSize = minSize;
        this.acquireTimeout = acquireTimeout;
        for (let i = 0; i < minSize; i++) {
            this.connections.push(this.createConnection());
        }
    }
    createConnection() {
        return { id: this.nextId++, inUse: false, lastUsed: Date.now(), createdAt: Date.now() };
    }
    async acquire() {
        for (const conn of this.connections) {
            if (!conn.inUse) {
                conn.inUse = true;
                conn.lastUsed = Date.now();
                return conn;
            }
        }
        if (this.connections.length < this.maxSize) {
            const conn = this.createConnection();
            conn.inUse = true;
            this.connections.push(conn);
            return conn;
        }
        const startTime = Date.now();
        while (Date.now() - startTime < this.acquireTimeout) {
            await this.delay(50);
            for (const conn of this.connections) {
                if (!conn.inUse) {
                    conn.inUse = true;
                    conn.lastUsed = Date.now();
                    return conn;
                }
            }
        }
        event_manager_1.EventManager.error('Connection pool timeout');
        return null;
    }
    release(conn) {
        conn.inUse = false;
        conn.lastUsed = Date.now();
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    close() {
        this.connections = [];
    }
    getStats() {
        let active = 0, idle = 0;
        for (const conn of this.connections) {
            if (conn.inUse)
                active++;
            else
                idle++;
        }
        return { active, idle, total: this.connections.length };
    }
}
exports.ConnectionPool = ConnectionPool;
class Transaction {
    constructor(pool) {
        this.conn = null;
        this.started = false;
        this.committed = false;
        this.rolledBack = false;
        this.operations = [];
        this.pool = pool;
    }
    async begin() {
        if (this.started)
            return;
        this.conn = await this.pool.acquire();
        this.started = true;
    }
    addOperation(op) {
        this.operations.push(op);
    }
    async commit() {
        if (!this.started || this.committed || this.rolledBack) {
            event_manager_1.EventManager.error('Transaction not active');
            return;
        }
        for (const op of this.operations) {
            await op.execute();
        }
        this.operations = [];
        this.committed = true;
        if (this.conn) {
            this.pool.release(this.conn);
            this.conn = null;
        }
    }
    async rollback() {
        if (!this.started || this.rolledBack)
            return;
        this.operations = [];
        this.rolledBack = true;
        if (this.conn) {
            this.pool.release(this.conn);
            this.conn = null;
        }
    }
    isActive() {
        return this.started && !this.committed && !this.rolledBack;
    }
    isCommitted() {
        return this.committed;
    }
    isRolledBack() {
        return this.rolledBack;
    }
}
exports.Transaction = Transaction;
function createTransaction(pool) {
    return new Transaction(pool);
}
//# sourceMappingURL=connection-pool.js.map