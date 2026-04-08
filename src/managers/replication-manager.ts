/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';
import * as path from 'path';
import { MD5 } from '../utils/md5';
import { EventManager } from '../utils/event-manager';

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

export class ReplicationManager {
  private rootPath: string;
  private config: ReplicationConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingSync: SyncRecord[] = [];
  private WAL_PATH: string;

  constructor(rootPath: string, config: ReplicationConfig) {
    this.rootPath = rootPath;
    this.config = config;
    this.WAL_PATH = path.join(rootPath, '_wal');
    
    if (!fs.existsSync(this.WAL_PATH)) {
      fs.mkdirSync(this.WAL_PATH, { recursive: true });
    }
  }

  start(): void {
    if (!this.config.enabled || this.config.mode !== 'master') return;
    
    this.syncInterval = setInterval(() => {
      this.syncToSlave();
    }, this.config.syncInterval);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  logOperation(op: SyncRecord): void {
    if (!this.config.enabled || this.config.mode !== 'master') return;
    
    this.pendingSync.push(op);
    
    const walFile = path.join(this.WAL_PATH, `${Date.now()}.json`);
    fs.writeFileSync(walFile, JSON.stringify(op));
  }

  async syncToSlave(): Promise<void> {
    if (!this.config.targetPath || this.pendingSync.length === 0) return;

    try {
      for (const op of this.pendingSync) {
        await this.applyOperationToSlave(op);
      }
      this.pendingSync = [];
    } catch (e) {
      EventManager.error('Replication sync failed', { error: e });
    }
    }

    private async applyOperationToSlave(op: SyncRecord): Promise<void> {
    const targetDbDir = path.join(this.config.targetPath!, MD5.hash(op.dbName));

    if (!fs.existsSync(targetDbDir)) {
      fs.mkdirSync(targetDbDir, { recursive: true });
    }

    const tableHash = MD5.hash(op.tableName);
    const tableDir = path.join(targetDbDir, tableHash);

    if (!fs.existsSync(tableDir)) {
      fs.mkdirSync(tableDir, { recursive: true });
    }

    for (const [fieldName, value] of Object.entries(op.data)) {
      const fieldFileName = MD5.hash(fieldName).substring(0, 12) + '.zdb';
      const fieldPath = path.join(tableDir, fieldFileName);

      if (op.operation === 'insert') {
        const exists = fs.existsSync(fieldPath);
        const content = exists ? fs.readFileSync(fieldPath, 'utf8') : '';
        const newContent = content + `${op.lineNumber}:${value}\n`;
        fs.writeFileSync(fieldPath, newContent, 'utf8');
      }
      else if (op.operation === 'update' && op.lineNumber) {
        const content = fs.readFileSync(fieldPath, 'utf8');
        const lines = content.split('\n').map(line => {
          if (line.startsWith(`${op.lineNumber}:`)) {
            return `${op.lineNumber}:${value}`;
          }
          return line;
        }).join('\n');
        fs.writeFileSync(fieldPath, lines, 'utf8');
      }
      else if (op.operation === 'delete' && op.lineNumber) {
        const content = fs.readFileSync(fieldPath, 'utf8');
        const lines = content.split('\n').filter(line => {
          return !line.startsWith(`${op.lineNumber}:`);
        }).join('\n');
        fs.writeFileSync(fieldPath, lines, 'utf8');
      }
    }
    }

    getStatus(): { pending: number; enabled: boolean; mode: string } {
    return {
      pending: this.pendingSync.length,
      enabled: this.config.enabled,
      mode: this.config.mode
    };
    }

    purgeWAL(beforeTimestamp: number): void {
    if (!fs.existsSync(this.WAL_PATH)) return;

    for (const file of fs.readdirSync(this.WAL_PATH)) {
      const filePath = path.join(this.WAL_PATH, file);
      const timestamp = parseInt(file.replace('.json', ''));
      if (timestamp < beforeTimestamp) {
        fs.unlinkSync(filePath);
      }
    }
    }
    }

    export function createReplicationManager(rootPath: string, config: ReplicationConfig): ReplicationManager {
    return new ReplicationManager(rootPath, config);
    }