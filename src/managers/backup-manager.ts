/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { Buffer } from 'buffer';
import { EventManager } from '../utils/event-manager';

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

const BACKUP_VERSION = 1;

export class BackupManager {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async createBackup(dbName: string, options: BackupOptions = {}): Promise<string> {
    const compressionLevel = options.compressionLevel ?? 6;
    const timestamp = Date.now();
    const backupDir = path.join(this.rootPath, '_backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      createdAt: timestamp,
      dbName,
      tables: [],
      recordCounts: new Map(),
      checksum: ''
    };

    const dbHash = require('./md5').MD5.hash(dbName);
    const dbDir = path.join(this.rootPath, dbHash);
    
    if (!fs.existsSync(dbDir)) {
      EventManager.error('Database not found');
      return '';
    }

    const backupData: any = {
      metadata,
      schema: null as string | null,
      tables: {} as Record<string, any>
    };

    if (options.includeSchema !== false) {
      const schemaPath = path.join(this.rootPath, 'schema.zdb');
      const manifestPath = path.join(this.rootPath, 'manifest.zdb');
      
      backupData.schema = {
        schema: fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath) : null,
        manifest: fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath) : null
      };
    }

    const tableDirs = fs.readdirSync(dbDir);
    for (const tableHash of tableDirs) {
      const tableDir = path.join(dbDir, tableHash);
      if (!fs.statSync(tableDir).isDirectory()) continue;

      metadata.tables.push(tableHash);
      const tableData: Record<string, string> = {};

      const files = fs.readdirSync(tableDir);
      let recordCount = 0;

      for (const file of files) {
        if (!file.endsWith('.zdb') || file.includes('__meta__')) continue;
        
        const filePath = path.join(tableDir, file);
        const data = fs.readFileSync(filePath);
        
        if (data.length > 9) {
          const dataLen = data.readUInt32BE(5);
          if (dataLen > 0 && dataLen <= data.length - 9) {
            const decrypted = this.xorDecrypt(data.slice(9, 9 + dataLen));
            tableData[file] = decrypted.toString('utf8');
            
            const lines = decrypted.toString('utf8').split('\n').filter((l: string) => l && !l.startsWith(':'));
            const lineNumbers = lines.map((line: string) => {
              const parts = line.split(':');
              const num = parseInt(parts[0] || '0');
              return isNaN(num) ? 0 : num;
            });
            recordCount = Math.max(recordCount, ...lineNumbers);
          }
        }
      }

      backupData.tables[tableHash] = tableData;
      metadata.recordCounts.set(tableHash, recordCount);
    }

    const jsonData = JSON.stringify(backupData, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      if (Buffer.isBuffer(value)) {
        return value.toString('base64');
      }
      return value;
    });

    const compressed = zlib.deflateSync(Buffer.from(jsonData), { level: compressionLevel });
    
    const checksum = this.computeChecksum(compressed);
    metadata.checksum = checksum;

    const finalData = JSON.stringify({
      ...backupData,
      metadata: {
        ...metadata,
        recordCounts: Object.fromEntries(metadata.recordCounts)
      }
    });

    const finalCompressed = zlib.deflateSync(Buffer.from(finalData), { level: compressionLevel });
    
    const backupFileName = `${dbName}_${timestamp}.zdbbak`;
    const backupPath = path.join(backupDir, backupFileName);
    
    fs.writeFileSync(backupPath, finalCompressed);

    return backupPath;
  }

  async restoreBackup(backupPath: string, targetDbName?: string): Promise<{ success: boolean; error?: string }> {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      const compressed = fs.readFileSync(backupPath);
      const decompressed = zlib.inflateSync(compressed);
      const jsonData = decompressed.toString('utf8');
      
      const backupData = JSON.parse(jsonData);
      const metadata = backupData.metadata;

      if (metadata.version !== BACKUP_VERSION) {
        return { success: false, error: 'Unsupported backup version' };
      }

      const checksum = this.computeChecksum(compressed);
      if (checksum !== metadata.checksum) {
        return { success: false, error: 'Backup checksum mismatch' };
      }

      const dbName = targetDbName || metadata.dbName;
      const dbHash = require('./md5').MD5.hash(dbName);
      const dbDir = path.join(this.rootPath, dbHash);
      
      if (!fs.existsSync(this.rootPath)) {
        fs.mkdirSync(this.rootPath, { recursive: true });
      }
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (backupData.schema) {
        const schemaPath = path.join(this.rootPath, 'schema.zdb');
        const manifestPath = path.join(this.rootPath, 'manifest.zdb');
        
        if (backupData.schema.schema) {
          const schemaBuffer = Buffer.from(backupData.schema.schema, 'base64');
          fs.writeFileSync(schemaPath, schemaBuffer);
        }
        if (backupData.schema.manifest) {
          const manifestBuffer = Buffer.from(backupData.schema.manifest, 'base64');
          fs.writeFileSync(manifestPath, manifestBuffer);
        }
      }

      for (const [tableHash, tableData] of Object.entries(backupData.tables as Record<string, Record<string, string>>)) {
        const tableDir = path.join(dbDir, tableHash);
        if (!fs.existsSync(tableDir)) {
          fs.mkdirSync(tableDir, { recursive: true });
        }

        for (const [fileName, data] of Object.entries(tableData)) {
          const filePath = path.join(tableDir, fileName);
          const content = data;
          const encrypted = this.xorEncrypt(Buffer.from(content, 'utf8'));
          
          const headerBuffer = Buffer.alloc(9);
          const MAGIC_BYTES = Buffer.from([0x5A, 0x45, 0x44, 0x42]);
          MAGIC_BYTES.copy(headerBuffer, 0);
          headerBuffer.writeUInt8(1, 4);
          headerBuffer.writeUInt32BE(encrypted.length, 5);
          
          const finalBuffer = Buffer.concat([headerBuffer, encrypted]);
          fs.writeFileSync(filePath, finalBuffer);
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  listBackups(): { name: string; path: string; size: number; created: number }[] {
    const backupDir = path.join(this.rootPath, '_backups');
    
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const backups: { name: string; path: string; size: number; created: number }[] = [];
    
    for (const file of fs.readdirSync(backupDir)) {
      if (!file.endsWith('.zdbbak')) continue;
      
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const created = parseInt(file.split('_')[1]?.replace('.zdbbak', '') || '0');
      
      backups.push({
        name: file,
        path: filePath,
        size: stats.size,
        created
      });
    }

    return backups.sort((a, b) => b.created - a.created);
  }

  deleteBackup(backupPath: string): boolean {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private xorEncrypt(data: Buffer): Buffer {
    const ENCRYPTION_KEY = Buffer.from('ZeroDB_2024_SecureKey!@#$%');
    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
    }
    return result;
  }

  private xorDecrypt(data: Buffer): Buffer {
    return this.xorEncrypt(data);
  }

  private computeChecksum(data: Buffer): string {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) % 0xFFFFFFFF;
    }
    return sum.toString(16);
  }
}
