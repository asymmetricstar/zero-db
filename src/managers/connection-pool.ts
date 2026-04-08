/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import { EventManager } from '../utils/event-manager';

export interface PooledConnection {
  id: number;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

export class ConnectionPool {
  private connections: PooledConnection[] = [];
  private maxSize: number;
  private minSize: number;
  private acquireTimeout: number;
  private nextId: number = 1;

  constructor(maxSize: number = 10, minSize: number = 2, acquireTimeout: number = 5000) {
    this.maxSize = maxSize;
    this.minSize = minSize;
    this.acquireTimeout = acquireTimeout;
    
    for (let i = 0; i < minSize; i++) {
      this.connections.push(this.createConnection());
    }
  }

  private createConnection(): PooledConnection {
    return { id: this.nextId++, inUse: false, lastUsed: Date.now(), createdAt: Date.now() };
  }

  async acquire(): Promise<PooledConnection | null> {
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

    EventManager.error('Connection pool timeout');
    return null;
  }

  release(conn: PooledConnection): void {
    conn.inUse = false;
    conn.lastUsed = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  close(): void {
    this.connections = [];
  }

  getStats(): { active: number; idle: number; total: number } {
    let active = 0, idle = 0;
    for (const conn of this.connections) {
      if (conn.inUse) active++;
      else idle++;
    }
    return { active, idle, total: this.connections.length };
  }
}

export class Transaction {
  private pool: ConnectionPool;
  private conn: PooledConnection | null | undefined = null;
  private started: boolean = false;
  private committed: boolean = false;
  private rolledBack: boolean = false;
  private operations: TransactionOperation[] = [];

  constructor(pool: ConnectionPool) {
    this.pool = pool;
  }

  async begin(): Promise<void> {
    if (this.started) return;
    this.conn = await this.pool.acquire();
    this.started = true;
  }

  addOperation(op: TransactionOperation): void {
    this.operations.push(op);
  }

  async commit(): Promise<void> {
    if (!this.started || this.committed || this.rolledBack) {
      EventManager.error('Transaction not active');
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

  async rollback(): Promise<void> {
    if (!this.started || this.rolledBack) return;
    this.operations = [];
    this.rolledBack = true;
    if (this.conn) {
      this.pool.release(this.conn);
      this.conn = null;
    }
  }

  isActive(): boolean {
    return this.started && !this.committed && !this.rolledBack;
  }

  isCommitted(): boolean {
    return this.committed;
  }

  isRolledBack(): boolean {
    return this.rolledBack;
  }
}

export interface TransactionOperation {
  execute(): Promise<void>;
  rollback(): Promise<void>;
}

export function createTransaction(pool: ConnectionPool): Transaction {
  return new Transaction(pool);
}