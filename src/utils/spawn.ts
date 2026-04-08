/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';
import * as path from 'path';
import { Crypto } from './crypto';
import { EventManager } from './event-manager';

export interface SpawnStats {
  hits: number;
  misses: number;
  size: number;
  buffered: number;
}

export class Spawn {
  private static writeQueue = new Map<string, Promise<void>>();
  private static pendingWrites = new Map<string, number>();
  private static readonly QUEUE_THRESHOLD = 5;
  
  public filePath: string;
  private dataCache: Map<number, string>;
  private writeBuffer: Map<number, string>;
  private deleteBuffer: Set<number>;
  private autoIncrement: number;
  private stats: SpawnStats;
  private flushTimer: NodeJS.Timeout | null = null;
  private loaded: boolean = false;
  private isReading: boolean = false;
  private readPromise: Promise<void> | null = null;

  constructor(rootPath: string, dbName: string, tableName: string, fieldName: string, fileName: string) {
    const dbHash = Crypto.hash(dbName);
    const tableHash = Crypto.hash(tableName);
    this.filePath = path.join(rootPath, dbHash, tableHash, fileName);
    this.dataCache = new Map();
    this.writeBuffer = new Map();
    this.deleteBuffer = new Set();
    this.autoIncrement = 1;
    this.stats = { hits: 0, misses: 0, size: 0, buffered: 0 };
  }

  static create(rootPath: string, dbName: string, tableName: string, fieldName: string, fileName: string): Spawn {
    return new Spawn(rootPath, dbName, tableName, fieldName, fileName);
  }

  private static getQueueKey(filePath: string): string {
    return filePath;
  }

  private static shouldQueue(filePath: string): boolean {
    const count = Spawn.pendingWrites.get(filePath) || 0;
    return count >= Spawn.QUEUE_THRESHOLD;
  }

  static async queueWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
    const key = this.getQueueKey(filePath);
    const current = this.pendingWrites.get(key) || 0;
    this.pendingWrites.set(key, current + 1);
    
    try {
      const previousWrite = this.writeQueue.get(key);
      const chain = previousWrite || Promise.resolve();
      
      const newWrite = chain.then(async () => {
        await writeFn();
      });
      
      this.writeQueue.set(key, newWrite);
      await newWrite;
    } finally {
      const count = this.pendingWrites.get(key) || 1;
      this.pendingWrites.set(key, count - 1);
    }
  }

  static async flushQueue(filePath: string): Promise<void> {
    const key = this.getQueueKey(filePath);
    const pending = this.writeQueue.get(key);
    if (pending) {
      await pending;
    }
  }

  static clearQueue(filePath: string): void {
    const key = this.getQueueKey(filePath);
    this.writeQueue.delete(key);
    this.pendingWrites.delete(key);
  }

  /**
   * Streaming Read - Bypasses Node.js 2GB Buffer Limit
   */
  async read(): Promise<void> {
    const hasExistingData = this.dataCache.size > 0;
    if (this.loaded) return;
    if (this.isReading) return this.readPromise!;

    if (!fs.existsSync(this.filePath)) {
      this.loaded = true;
      return;
    }

    this.isReading = true;
    this.readPromise = new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filePath);
      let headerProcessed = false;
      let remainingHeader = Buffer.alloc(0);
      let dataLength = 0;
      let processedLength = 0;
      let remainingData = '';
      
      stream.on('data', (chunk: Buffer) => {
        let currentChunk = chunk;
        
        if (!headerProcessed) {
          const combined = Buffer.concat([remainingHeader, currentChunk]);
          if (combined.length < 9) {
            remainingHeader = combined;
            return;
          }
          
          if (combined.slice(0, 4).equals(Buffer.from([0x5A, 0x45, 0x44, 0x42]))) {
            dataLength = combined.readUInt32BE(5);
            headerProcessed = true;
            currentChunk = combined.slice(9);
          } else {
            headerProcessed = true;
            currentChunk = combined;
            dataLength = -1;
          }
        }
        
        let text = '';
        if (dataLength === -1) {
          text = currentChunk.toString('utf8');
        } else {
          const decrypted = Crypto.xor(currentChunk, processedLength);
          processedLength += currentChunk.length;
          text = decrypted.toString('utf8');
        }
        
        remainingData += text;
        const lines = remainingData.split('\n');
        remainingData = lines.pop() || '';
        
        for (const line of lines) {
          if (hasExistingData) {
            // Merge: only add line if it doesn't exist in cache (keep newer in-memory data)
            const parts = line.trim().split(':');
            if (parts.length >= 2) {
              const lineNum = parseInt(parts[0], 10);
              if (!this.dataCache.has(lineNum)) {
                this.processLine(line);
              }
            }
          } else {
            this.processLine(line);
          }
        }
      });

      stream.on('end', () => {
        if (remainingData) {
          if (hasExistingData) {
            const parts = remainingData.trim().split(':');
            if (parts.length >= 2) {
              const lineNum = parseInt(parts[0], 10);
              if (!this.dataCache.has(lineNum)) {
                this.processLine(remainingData);
              }
            }
          } else {
            this.processLine(remainingData);
          }
        }
        this.stats.size = this.dataCache.size;
        this.loaded = true;
        this.isReading = false;
        resolve();
      });

      stream.on('error', (err) => {
        EventManager.error(`Error reading file stream`, { path: this.filePath, error: err.message });
        this.isReading = false;
        reject(err);
      });
    });

    return this.readPromise;
  }

  private processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('AUTO_INCREMENT:')) {
      const parts = trimmed.split(':');
      if (parts.length > 1) {
        this.autoIncrement = parseInt(parts[1], 10);
      }
      return;
    }

    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      const lineNum = parseInt(parts[0], 10);
      const value = parts.slice(1).join(':');
      this.dataCache.set(lineNum, value);
    }
  }

  private async write(): Promise<void> {
    if (Spawn.shouldQueue(this.filePath)) {
      return Spawn.queueWrite(this.filePath, async () => {
        await this.doWrite();
      });
    } else {
      return this.doWrite();
    }
  }

  private async doWrite(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(this.filePath);
      
      const header = Buffer.alloc(9);
      Buffer.from([0x5A, 0x45, 0x44, 0x42]).copy(header, 0);
      header.writeUInt8(1, 4);
      
      const sortedKeys = Array.from(this.dataCache.keys()).sort((a, b) => a - b);
      
      let totalLength = Buffer.byteLength(`AUTO_INCREMENT:${this.autoIncrement}\n`, 'utf8');
      for (const lineNum of sortedKeys) {
        const value = this.dataCache.get(lineNum);
        if (value !== undefined) {
          totalLength += Buffer.byteLength(`${lineNum}:${value}\n`, 'utf8');
        }
      }
      
      header.writeUInt32BE(totalLength, 5);
      writeStream.write(header);
      
      let processedLength = 0;
      const xorWrite = (content: string) => {
        const buf = Buffer.from(content, 'utf8');
        const encrypted = Crypto.xor(buf, processedLength);
        processedLength += buf.length;
        return writeStream.write(encrypted);
      };

      xorWrite(`AUTO_INCREMENT:${this.autoIncrement}\n`);
      for (const lineNum of sortedKeys) {
        const value = this.dataCache.get(lineNum);
        if (value !== undefined) {
          xorWrite(`${lineNum}:${value}\n`);
        }
      }

      writeStream.end();
      writeStream.on('finish', () => {
        this.writeBuffer.clear();
        this.deleteBuffer.clear();
        this.loaded = true; // Mark as loaded since dataCache is now in sync with disk
        resolve();
      });
      writeStream.on('error', reject);
    });
  }

  append(line: number, value: string): void {
    this.dataCache.set(line, value);
    this.writeBuffer.set(line, value);
    // Update autoIncrement to track the next available ID
    if (line >= this.autoIncrement) {
      this.autoIncrement = line + 1;
    }
    this.scheduleFlush();
  }

  update(lines: Set<number>, value: string): void {
    for (const line of lines) {
      this.dataCache.set(line, value);
      this.writeBuffer.set(line, value);
    }
    this.scheduleFlush();
  }

  delete(lines: Set<number>): void {
    for (const line of lines) {
      this.dataCache.delete(line);
      this.deleteBuffer.add(line);
    }
    this.scheduleFlush();
  }

  getAll(): Map<number, string> {
    this.stats.hits++;
    return new Map(this.dataCache);
  }

  get(line: number): string | undefined {
    const val = this.dataCache.get(line);
    if (val !== undefined) this.stats.hits++;
    else this.stats.misses++;
    return val;
  }

  getAutoIncrement(): number {
    if (fs.existsSync(this.filePath)) {
      const content = fs.readFileSync(this.filePath);
      if (content.length > 9) {
        const dataLength = content.readUInt32BE(5);
        const body = content.slice(9, 9 + dataLength);
        const decrypted = Crypto.xor(body, 0);
        const text = decrypted.toString('utf8');
        const autoMatch = text.match(/^AUTO_INCREMENT:(\d+)/m);
        if (autoMatch) {
          return parseInt(autoMatch[1], 10);
        }
      }
    }
    return this.autoIncrement;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  resetLoaded(): void {
    this.loaded = false;
    this.dataCache.clear();
  }

  reload(): void {
    // Clear cache and mark as not loaded so we re-read from disk
    this.loaded = false;
    this.dataCache.clear();
  }

  async ensureMaxLine(): Promise<number> {
    if (!this.loaded && fs.existsSync(this.filePath)) {
      await this.read();
    }
    return this.getMaxLine();
  }

  getMaxLine(): number {
    if (this.dataCache.size === 0 && fs.existsSync(this.filePath)) {
      const content = fs.readFileSync(this.filePath);
      if (content.length > 9) {
        const dataLength = content.readUInt32BE(5);
        const body = content.slice(9, 9 + dataLength);
        const decrypted = Crypto.xor(body, 0);
        const text = decrypted.toString('utf8');
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('AUTO_INCREMENT:')) continue;
          const parts = trimmed.split(':');
          if (parts.length >= 2) {
            const lineNum = parseInt(parts[0], 10);
            if (!isNaN(lineNum)) {
              this.dataCache.set(lineNum, parts.slice(1).join(':'));
            }
          }
        }
      }
    }
    
    let max = 0;
    for (const line of this.dataCache.keys()) {
      if (line > max) max = line;
    }
    return max;
  }

  getDataCache(): Map<number, string> {
    return new Map(this.dataCache);
  }

  setAutoIncrement(val: number): void {
    this.autoIncrement = val;
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => this.flush(), 100);
  }

  private async flush(): Promise<void> {
    this.flushTimer = null;
    await this.write();
  }

  async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.write();
  }

  getStats(): SpawnStats {
    return { ...this.stats, buffered: this.writeBuffer.size };
  }
}
