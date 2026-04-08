/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';
import * as path from 'path';
import { Crypto } from '../utils/crypto';
import { CacheManager } from '../utils/cache-manager';
import { FieldDefinition } from '../types';

export class FieldManager {
  private rootPath: string;
  private manifestPath: string;
  private cache: CacheManager;

  constructor(rootPath: string, cache: CacheManager) {
    this.rootPath = rootPath;
    this.manifestPath = path.join(rootPath, 'manifest.zdb');
    this.cache = cache;
  }

  private readBinaryFile(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const buffer = fs.readFileSync(filePath);
    return Crypto.unpack(buffer);
  }

  private getManifestContent(): string {
    const cached = this.cache.get('manifest');
    if (cached !== null) return cached;

    const content = this.readBinaryFile(this.manifestPath);
    this.cache.set('manifest', content);
    return content;
  }

  invalidate(): void {
    this.cache.invalidate('manifest');
  }

  getFieldFileName(dbName: string, tableName: string, fieldName: string): string | null {
    const fields = this.getAllFields(dbName, tableName);
    return fields.get(fieldName) || null;
  }

  getFieldPath(dbName: string, tableName: string, fieldName: string): string | null {
    const fieldFileName = this.getFieldFileName(dbName, tableName, fieldName);
    if (!fieldFileName) {
      return null;
    }

    const tableDir = path.join(
      this.rootPath,
      Crypto.hash(dbName),
      Crypto.hash(tableName)
    );

    return path.join(tableDir, fieldFileName);
  }

  getAllFields(dbName: string, tableName: string): Map<string, string> {
    const fields = new Map<string, string>();
    const content = this.getManifestContent();
    if (!content) return fields;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      const parts = trimmed.split(':');
      if (parts.length >= 4 && parts[0] === dbName && parts[1] === tableName) {
        const fieldName = parts[2];
        const fileName = parts[3];
        if (fieldName && fileName) {
          fields.set(fieldName, fileName);
        }
      }
    }

    return fields;
  }

  getTableFields(dbName: string, tableName: string): FieldDefinition[] {
    const tableDir = path.join(
      this.rootPath,
      Crypto.hash(dbName),
      Crypto.hash(tableName)
    );

    if (!fs.existsSync(tableDir)) {
      return [];
    }

    const fields: FieldDefinition[] = [];
    const files = fs.readdirSync(tableDir);

    for (const file of files) {
      if (file.endsWith('.zdb')) {
        const originalName = this.cache.getOriginalName(file) || file;
        fields.push({
          name: originalName,
          type: 'string',
          isAuto: false,
          allowNull: true,
          defaultValue: '',
          maxLength: 255,
          fileName: file
        });
      }
    }

    return fields;
  }
}
