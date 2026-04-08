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
import { TableDefinition, FieldDefinition, FieldType } from '../types';
import { Buffer } from 'buffer';

interface TableIndex {
  dbName: string;
  tableName: string;
  fields: Map<string, string>;
  fieldTypes: Map<string, { type: FieldType; isAuto: boolean; allowNull: boolean; defaultValue: string; maxLength: number }>;
  loaded: boolean;
}

export class TableManager {
  private rootPath: string;
  private schemaPath: string;
  private manifestPath: string;
  private cache: CacheManager;
  private tableIndex: Map<string, TableIndex>;

  constructor(rootPath: string, cache: CacheManager) {
    this.rootPath = rootPath;
    this.schemaPath = path.join(rootPath, 'schema.zdb');
    this.manifestPath = path.join(rootPath, 'manifest.zdb');
    this.cache = cache;
    this.tableIndex = new Map();
  }

  invalidate(): void {
    this.tableIndex.clear();
    this.cache.invalidate('schema');
    this.cache.invalidate('manifest');
  }

  getTableDir(dbName: string, tableName: string): string {
    const dbHash = Crypto.hash(dbName);
    const tableHash = Crypto.hash(tableName);
    return path.join(this.rootPath, dbHash, tableHash);
  }

  private getTableIndex(dbName: string, tableName: string): TableIndex {
    const key = `${dbName}:${tableName}`;
    
    if (!this.tableIndex.has(key)) {
      this.tableIndex.set(key, {
        dbName,
        tableName,
        fields: new Map(),
        fieldTypes: new Map(),
        loaded: false
      });
    }
    
    return this.tableIndex.get(key)!;
  }

  private loadTableIndex(dbName: string, tableName: string): void {
    const index = this.getTableIndex(dbName, tableName);
    if (index.loaded) return;

    const schemaContent = this.getSchemaContent();
    const manifestContent = this.getManifestContent();

    if (!schemaContent || !manifestContent) {
      index.loaded = true;
      return;
    }

    const schemaLines = schemaContent.split('\n');
    const manifestLines = manifestContent.split('\n');

    let inTableSchema = false;
    for (const line of schemaLines) {
      const trimmed = line.trim();
      if (trimmed === `${dbName}:${tableName}`) {
        inTableSchema = true;
        continue;
      }
      if (inTableSchema) {
        if (trimmed.includes(':') && !trimmed.startsWith('(') && !trimmed.includes(':(')) {
          inTableSchema = false;
        }
        if (inTableSchema && trimmed.includes(':(')) {
          const parts = trimmed.split(':');
          const fieldName = parts[0];
          const typeStr = parts[1].replace(/[()]/g, '');
          const nullStr = parts[2]?.replace(/[()]/g, '') || 'Null';
          const defaultVal = parts[3]?.replace(/[()]/g, '') || '';
          const maxLen = parseInt(parts[4] || '255', 10);

          index.fieldTypes.set(fieldName, {
            type: typeStr as FieldType,
            isAuto: typeStr === 'auto',
            allowNull: nullStr === 'Null',
            defaultValue: defaultVal,
            maxLength: isNaN(maxLen) ? 255 : maxLen
          });
        }
      }
    }

    for (const line of manifestLines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      const parts = trimmed.split(':');
      if (parts.length >= 4 && parts[0] === dbName && parts[1] === tableName) {
        const fieldName = parts[2];
        const fileName = parts[3];
        if (fieldName && fileName) {
          index.fields.set(fieldName, fileName);
          this.cache.setNameMapping(fileName, fieldName);
        }
      }
    }

    index.loaded = true;
    this.cache.setNameMapping(Crypto.hash(dbName), dbName);
    this.cache.setNameMapping(Crypto.hash(tableName), tableName);
  }

  private readBinaryFile(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const buffer = fs.readFileSync(filePath);
    return Crypto.unpack(buffer);
  }

  private writeBinaryFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!content.trim()) {
      fs.writeFileSync(filePath, Buffer.alloc(0));
      return;
    }

    fs.writeFileSync(filePath, Crypto.pack(content));
  }

  private getSchemaContent(): string {
    const cached = this.cache.get('schema');
    if (cached !== null) return cached;
    const content = this.readBinaryFile(this.schemaPath);
    this.cache.set('schema', content);
    return content;
  }

  private getManifestContent(): string {
    const cached = this.cache.get('manifest');
    if (cached !== null) return cached;
    const content = this.readBinaryFile(this.manifestPath);
    this.cache.set('manifest', content);
    return content;
  }

  private invalidateSchema(): void {
    this.cache.invalidate('schema');
  }

  private invalidateManifest(): void {
    this.cache.invalidate('manifest');
  }

   createTable(dbName: string, tableName: string, fields?: Array<{
     name: string;
     type: FieldType;
     option?: {
       isAuto?: boolean;
       allowNull?: boolean;
       defaultValue?: string;
       maxLength?: number;
     };
   }>): boolean {
     if (this.tableExists(dbName, tableName)) {
       return false;
     }

     const dbDir = path.join(this.rootPath, Crypto.hash(dbName));
     const tableDir = this.getTableDir(dbName, tableName);

     if (!fs.existsSync(dbDir)) {
       fs.mkdirSync(dbDir, { recursive: true });
     }
     if (!fs.existsSync(tableDir)) {
       fs.mkdirSync(tableDir, { recursive: true });
     }

     this.appendToFile(this.schemaPath, `${dbName}:${tableName}\n`);
     this.appendToFile(this.manifestPath, `${dbName}:${tableName}:fields\n`);

     // Add system timestamp fields
     this.addField(dbName, tableName, 'created_at', 'timestamp');
     this.addField(dbName, tableName, 'updated_at', 'timestamp');

     // Add fields if provided
     if (fields && fields.length > 0) {
       for (const field of fields) {
         if (field.name === 'created_at' || field.name === 'updated_at') continue;
         this.addField(dbName, tableName, field.name, field.type, field.option || {});
       }
     }

     this.invalidateSchema();
     this.invalidateManifest();

     const key = `${dbName}:${tableName}`;
     this.tableIndex.delete(key);
     this.loadTableIndex(dbName, tableName);

     return true;
   }

  addField(
    dbName: string,
    tableName: string,
    fieldName: string,
    type: FieldType,
    options: {
      isAuto?: boolean;
      allowNull?: boolean;
      defaultValue?: string;
      maxLength?: number;
    } = {}
  ): boolean {
    if (this.hasField(dbName, tableName, fieldName)) {
      return false;
    }

    const isAuto = options.isAuto ?? false;
    const allowNull = options.allowNull ?? true;
    const defaultValue = options.defaultValue ?? '';
    const maxLength = options.maxLength ?? 255;

    const fileName = Crypto.hash(fieldName).substring(0, 12) + '.zdb';
    const tableDir = this.getTableDir(dbName, tableName);

    if (!fs.existsSync(tableDir)) {
      this.createTable(dbName, tableName);
    }

    const fieldPath = path.join(tableDir, fileName);
    if (!fs.existsSync(fieldPath)) {
      this.writeBinaryFile(fieldPath, '');
    }

    const typeStr = isAuto ? 'auto' : type;
    const nullStr = allowNull ? 'Null' : 'NOT';
    const fieldDef = `${fieldName}:(${typeStr}):(${nullStr}):(${defaultValue}):${maxLength}`;

    this.appendToFile(this.schemaPath, `${fieldDef}\n`);
    this.appendToFile(this.manifestPath, `${dbName}:${tableName}:${fieldName}:${fileName}\n`);

    this.invalidateSchema();
    this.invalidateManifest();

    const key = `${dbName}:${tableName}`;
    this.tableIndex.delete(key);
    this.loadTableIndex(dbName, tableName);

    return true;
  }

  getTableDefinition(dbName: string, tableName: string): TableDefinition | null {
    this.loadTableIndex(dbName, tableName);
    const index = this.getTableIndex(dbName, tableName);

    if (index.fields.size === 0) {
        if (!this.tableExists(dbName, tableName)) return null;
    }

    const fields = new Map<string, FieldDefinition>();
    for (const [fieldName, fileName] of index.fields) {
        const typeInfo = index.fieldTypes.get(fieldName);
        fields.set(fieldName, {
            name: fieldName,
            type: typeInfo?.type || 'string',
            isAuto: typeInfo?.isAuto || false,
            allowNull: typeInfo?.allowNull ?? true,
            defaultValue: typeInfo?.defaultValue || '',
            maxLength: typeInfo?.maxLength || 255,
            fileName: fileName
        });
    }

    return { dbName, tableName, fields };
  }

  getTableList(dbName: string): string[] {
    const tables: string[] = [];
    const content = this.getSchemaContent();
    if (!content) return tables;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const parts = trimmed.split(':');
      if (parts.length === 2 && parts[0] === dbName) {
        const tableName = parts[1];
        if (!tables.includes(tableName)) {
          tables.push(tableName);
        }
      }
    }

    return tables;
  }

  tableExists(dbName: string, tableName: string): boolean {
    const tableDir = this.getTableDir(dbName, tableName);
    return fs.existsSync(tableDir);
  }

  hasField(dbName: string, tableName: string, fieldName: string): boolean {
    this.loadTableIndex(dbName, tableName);
    const index = this.getTableIndex(dbName, tableName);
    return index.fields.has(fieldName);
  }

  getAllFields(dbName: string, tableName: string): Map<string, string> {
    this.loadTableIndex(dbName, tableName);
    const index = this.getTableIndex(dbName, tableName);
    return new Map(index.fields);
  }

  getTableFields(dbName: string, tableName: string): FieldDefinition[] {
    const def = this.getTableDefinition(dbName, tableName);
    if (!def) return [];
    return Array.from(def.fields.values());
  }

  dropTable(dbName: string, tableName: string): boolean {
    const tableDir = this.getTableDir(dbName, tableName);

    if (!fs.existsSync(tableDir)) {
      return false;
    }

    fs.rmSync(tableDir, { recursive: true, force: true });
    
    const schemaContent = this.getSchemaContent();
    const schemaLines = schemaContent.split('\n');
    const newSchemaLines: string[] = [];
    let skippingTable = false;

    for (const line of schemaLines) {
        const trimmed = line.trim();
        if (trimmed === `${dbName}:${tableName}`) {
            skippingTable = true;
            continue;
        }
        if (skippingTable) {
            if (trimmed.includes(':') && !trimmed.startsWith('(') && !trimmed.includes(':(')) {
                skippingTable = false;
            } else if (trimmed.includes(':(')) {
                continue;
            } else {
                skippingTable = false;
            }
        }
        if (!skippingTable) {
            newSchemaLines.push(line);
        }
    }
    this.writeBinaryFile(this.schemaPath, newSchemaLines.join('\n'));

    const manifestContent = this.getManifestContent();
    const newManifestLines = manifestContent.split('\n').filter(line => {
        const parts = line.split(':');
        return !(parts.length >= 2 && parts[0] === dbName && parts[1] === tableName);
    });
    this.writeBinaryFile(this.manifestPath, newManifestLines.join('\n'));

    this.invalidateSchema();
    this.invalidateManifest();

    const key = `${dbName}:${tableName}`;
    this.tableIndex.delete(key);

    return true;
  }

  renameTable(dbName: string, oldName: string, newName: string): void {
    const oldDir = this.getTableDir(dbName, oldName);
    const newDir = this.getTableDir(dbName, newName);

    if (!fs.existsSync(oldDir)) return;
    if (fs.existsSync(newDir)) return;

    fs.renameSync(oldDir, newDir);

    const oldKey = `${dbName}:${oldName}`;
    this.tableIndex.delete(oldKey);

    const schemaContent = this.getSchemaContent();
    const newSchemaLines: string[] = [];

    for (const line of schemaContent.split('\n')) {
      const parts = line.split(':');
      if (parts.length === 2 && parts[0] === dbName && parts[1] === oldName) {
        newSchemaLines.push(`${dbName}:${newName}`);
      } else {
        newSchemaLines.push(line);
      }
    }

    this.writeBinaryFile(this.schemaPath, newSchemaLines.join('\n'));
    this.invalidateSchema();

    const manifestContent = this.getManifestContent();
    const newManifestLines: string[] = [];

    for (const line of manifestContent.split('\n')) {
      const parts = line.split(':');
      if (parts.length >= 3 && parts[0] === dbName && parts[1] === oldName) {
        parts[1] = newName;
        newManifestLines.push(parts.join(':'));
      } else {
        newManifestLines.push(line);
      }
    }

    this.writeBinaryFile(this.manifestPath, newManifestLines.join('\n'));
    this.invalidateManifest();
  }

  renameField(dbName: string, tableName: string, oldName: string, newName: string, oldFileName: string): void {
    const newFileName = Crypto.hash(newName).substring(0, 12) + '.zdb';
    
    const tableDir = this.getTableDir(dbName, tableName);
    const oldPath = path.join(tableDir, oldFileName);
    const newPath = path.join(tableDir, newFileName);
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
    }

    const key = `${dbName}:${tableName}`;
    this.tableIndex.delete(key);

    const manifestContent = this.getManifestContent();
    const newLines: string[] = [];

    for (const line of manifestContent.split('\n')) {
      const parts = line.split(':');
      if (parts.length >= 4 && parts[0] === dbName && parts[1] === tableName && parts[2] === oldName) {
        parts[2] = newName;
        parts[3] = newFileName;
        newLines.push(parts.join(':'));
      } else {
        newLines.push(line);
      }
    }

    this.writeBinaryFile(this.manifestPath, newLines.join('\n'));
    this.invalidateManifest();
  }

  getFieldFileName(dbName: string, tableName: string, fieldName: string): string | null {
    this.loadTableIndex(dbName, tableName);
    const index = this.getTableIndex(dbName, tableName);
    return index.fields.get(fieldName) || null;
  }

  private appendToFile(filePath: string, content: string): void {
    const existing = this.readBinaryFile(filePath);
    this.writeBinaryFile(filePath, existing + content);
  }
}
