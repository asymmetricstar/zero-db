/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';
import { CRC32 } from './crc32';

interface WriteOperation {
  filePath: string;
  content: string;
  timestamp: number;
}

export class WriteQueue {
  private queue: WriteOperation[] = [];
  private knownCrcs: Map<string, { crc: number; timestamp: number }> = new Map();
  private processing: boolean = false;
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 50) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  enqueue(filePath: string, content: string): void {
    this.queue.push({
      filePath,
      content,
      timestamp: Date.now()
    });
  }

  async flush(): Promise<{ success: boolean; errors: string[] }> {
    if (this.processing) return { success: false, errors: ['Flush already in progress'] };
    this.processing = true;

    const errors: string[] = [];

    while (this.queue.length > 0) {
      const op = this.queue.shift()!;
      const success = await this.processWrite(op, errors);
      if (!success) break;
    }

    this.processing = false;
    return { success: errors.length === 0, errors };
  }

  private async processWrite(op: WriteOperation, errors: string[]): Promise<boolean> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const currentContent = fs.existsSync(op.filePath) ? fs.readFileSync(op.filePath, 'utf8') : '';
        const currentCrc = this.extractCrc(currentContent);

        const known = this.knownCrcs.get(op.filePath);
        if (known && known.crc !== currentCrc) {
          if (attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay * (attempt + 1));
            continue;
          }
          errors.push(`Write conflict on ${op.filePath} after ${this.maxRetries} retries`);
          return false;
        }

        const newContent = op.content;
        const newCrc = CRC32.compute(newContent);
        const finalContent = `${newContent}\n#crc:${CRC32.toHex(newCrc)}`;

        const tempPath = op.filePath + '.tmp';
        fs.writeFileSync(tempPath, finalContent, 'utf8');
        fs.renameSync(tempPath, op.filePath);

        this.knownCrcs.set(op.filePath, { crc: newCrc, timestamp: Date.now() });
        return true;
      } catch (e: any) {
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1));
          continue;
        }
        errors.push(`Write failed on ${op.filePath}: ${e.message}`);
        return false;
      }
    }
    return false;
  }

  syncFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const crc = this.extractCrc(content);
      this.knownCrcs.set(filePath, { crc, timestamp: Date.now() });
    }
  }

  clear(): void {
    this.queue = [];
    this.knownCrcs.clear();
  }

  size(): number {
    return this.queue.length;
  }

  private extractCrc(content: string): number {
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 2];
    if (lastLine && lastLine.startsWith('#crc:')) {
      return parseInt(lastLine.substring(5), 16);
    }
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
