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
import { UserCredentials } from '../types';

export interface DatabaseInfo {
  name: string;
  tables: string[];
  users: Map<string, UserCredentials>;
  isPublic: boolean;
  owner: string[];
}

interface DatabaseIndex {
  databases: Map<string, DatabaseInfo>;
  loaded: boolean;
}

export class DatabaseManager {
  private rootPath: string;
  private registryPath: string;
  private cache: CacheManager;
  private dbIndex: DatabaseIndex;

  constructor(rootPath: string, cache: CacheManager) {
    this.rootPath = rootPath;
    this.registryPath = path.join(rootPath, 'registry.zdb');
    this.cache = cache;
    this.dbIndex = {
      databases: new Map(),
      loaded: false
    };
  }

  private loadIndex(): void {
    if (this.dbIndex.loaded) return;

    const content = this.getRegistryContent();
    if (!content) {
      this.dbIndex.loaded = true;
      return;
    }

    const lines = content.split('\n');
    let currentDb: string | null = null;
    let currentTables: string[] = [];
    let currentUsers = new Map<string, UserCredentials>();
    let currentIsPublic = false;
    let currentOwner: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.endsWith(':db') && !trimmed.includes(':user:')) {
     if (currentDb) {
       this.dbIndex.databases.set(currentDb, {
         name: currentDb,
         tables: [...currentTables],
         users: new Map(currentUsers),
         isPublic: currentIsPublic,
         owner: currentOwner
       });
     }
        currentDb = trimmed.replace(':db', '');
        currentTables = [];
        currentUsers = new Map();
        currentIsPublic = false;
        currentOwner = [];
      } else if (trimmed.includes(':tables:')) {
        const parts = trimmed.split(':');
        const dbNameInLine = parts[0];
        if (dbNameInLine === currentDb) {
            const tablesPart = trimmed.split(':tables:')[1];
            if (tablesPart) {
                currentTables = tablesPart.split(',').filter(t => t);
            }
        }
       } else if (trimmed.includes(':user:') && currentDb) {
          const parts = trimmed.split(':');
          const dbNameInLine = parts[0];
          if (dbNameInLine === currentDb && parts.length >= 8) {
            const username = parts[2];
            const password = parts[4];
            const permIndex = parts.indexOf('perm');
            const permission = permIndex !== -1 ? parseInt(parts[permIndex + 1], 10) : 0;
            const isGrandIndex = parts.indexOf('grand');
            const isGrand = isGrandIndex !== -1 ? parseInt(parts[isGrandIndex + 1], 10) === 1 : false;
            currentUsers.set(username, { username, password, permission, isGrand });
          }
        } else if (trimmed.startsWith(currentDb + ':isPublic:') && currentDb) {
          const isPublicVal = trimmed.split(':isPublic:')[1];
          currentIsPublic = isPublicVal === '1';
        } else if (trimmed.startsWith(currentDb + ':owner:') && currentDb) {
          const ownerVal = trimmed.split(':owner:')[1];
          currentOwner = ownerVal ? ownerVal.split(',').filter(o => o) : [];
        }
    }

    if (currentDb) {
      this.dbIndex.databases.set(currentDb, {
       name: currentDb,
         tables: [...currentTables],
         users: new Map(currentUsers),
         isPublic: currentIsPublic,
         owner: currentOwner
       });
    }

    this.dbIndex.loaded = true;
  }

  private readRegistryRaw(): Buffer {
    if (!fs.existsSync(this.registryPath)) {
      return Buffer.alloc(0);
    }
    return fs.readFileSync(this.registryPath);
  }

  private writeRegistry(content: string): void {
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!content.trim()) {
      fs.writeFileSync(this.registryPath, Buffer.alloc(0));
      return;
    }

    fs.writeFileSync(this.registryPath, Crypto.pack(content));
  }

  private getRegistryContent(): string {
    const cached = this.cache.get('registry');
    if (cached !== null) {
      return cached;
    }

    const buffer = this.readRegistryRaw();
    const content = Crypto.unpack(buffer);
    this.cache.set('registry', content);
    return content;
  }

  private saveRegistryFromIndex(): void {
    const lines: string[] = [];
    
    for (const [dbName, dbInfo] of this.dbIndex.databases) {
      lines.push(`${dbName}:db`);
      if (dbInfo.tables.length > 0) {
        lines.push(`${dbName}:tables:${dbInfo.tables.join(',')}`);
      } else {
        lines.push(`${dbName}:tables:`);
      }
      
      // Save isPublic and owner
      lines.push(`${dbName}:isPublic:${dbInfo.isPublic ? 1 : 0}`);
      lines.push(`${dbName}:owner:${dbInfo.owner.join(',')}`);
      
       for (const [, user] of dbInfo.users) {
         lines.push(`${dbName}:user:${user.username}:pass:${user.password}:perm:${user.permission}:grand:${user.isGrand ? 1 : 0}`);
      }
    }

    const content = lines.join('\n');
    this.writeRegistry(content);
    this.cache.set('registry', content);
  }

  invalidate(): void {
    this.dbIndex.loaded = false;
    this.dbIndex.databases.clear();
  }

  databaseExists(dbName: string): boolean {
    this.loadIndex();
    return this.dbIndex.databases.has(dbName);
  }

    createDatabase(dbName: string, options: { isPublic?: boolean; owner?: string[] } = {}): boolean {
      this.loadIndex();
      
      if (this.dbIndex.databases.has(dbName)) {
        return false;
      }
      
      // Validate options
      if (options.isPublic === true && (!options.owner || options.owner.length === 0)) {
        // For public databases, owner is optional but if provided must have at least one owner
        // If no owner provided, we'll use an empty array meaning truly public (no ownership restriction)
      }
      
      if (!fs.existsSync(this.rootPath)) {
        fs.mkdirSync(this.rootPath, { recursive: true });
      }

    if (!fs.existsSync(this.rootPath)) {
      fs.mkdirSync(this.rootPath, { recursive: true });
    }

    const dbDir = path.join(this.rootPath, Crypto.hash(dbName));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

     this.dbIndex.databases.set(dbName, {
       name: dbName,
       tables: [],
       users: new Map(),
       isPublic: options.isPublic ?? false,
       owner: options.owner ?? []
     });

    this.saveRegistryFromIndex();
    return true;
  }

  dropDatabase(dbName: string): boolean {
    this.loadIndex();
    if (!this.dbIndex.databases.has(dbName)) return false;

    const dbDir = path.join(this.rootPath, Crypto.hash(dbName));
    if (fs.existsSync(dbDir)) {
      try {
        fs.rmSync(dbDir, { recursive: true, force: true });
      } catch (e: any) {
        // Ignore errors during deletion
      }
    }

    this.dbIndex.databases.delete(dbName);
    this.saveRegistryFromIndex();
    return true;
  }

  authenticate(dbName: string, username: string, password: string): UserCredentials | null {
    this.loadIndex();
    const db = this.dbIndex.databases.get(dbName);
    if (!db) return null;

    const user = db.users.get(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

    addUser(dbName: string, username: string, password: string, permission: number, isGrand: boolean = false): boolean {
      this.loadIndex();
      const db = this.dbIndex.databases.get(dbName);
      if (!db) return false;

      db.users.set(username, { username, password, permission, isGrand });
      this.saveRegistryFromIndex();
      return true;
    }

    getDatabaseInfo(dbName: string): DatabaseInfo | null {
      this.loadIndex();
      return this.dbIndex.databases.get(dbName) ?? null;
    }

    listDatabases(): string[] {
      this.loadIndex();
      return Array.from(this.dbIndex.databases.keys());
    }

    addOwner(dbName: string, username: string): boolean {
      this.loadIndex();
      const db = this.dbIndex.databases.get(dbName);
      if (!db) return false;
      
      if (!db.owner.includes(username)) {
        db.owner.push(username);
        this.saveRegistryFromIndex();
      }
      return true;
    }

    removeOwner(dbName: string, username: string): boolean {
      this.loadIndex();
      const db = this.dbIndex.databases.get(dbName);
      if (!db) return false;
      
      db.owner = db.owner.filter(o => o !== username);
      this.saveRegistryFromIndex();
      return true;
    }

    setPublic(dbName: string, isPublic: boolean): boolean {
      this.loadIndex();
      const db = this.dbIndex.databases.get(dbName);
      if (!db) return false;
      
      db.isPublic = isPublic;
      this.saveRegistryFromIndex();
      return true;
    }

  renameDatabase(oldDb: string, newName: string): boolean {
    this.loadIndex();
    const dbInfo = this.dbIndex.databases.get(oldDb);
    if (!dbInfo) return false;

    this.dbIndex.databases.delete(oldDb);
    dbInfo.name = newName;
    this.dbIndex.databases.set(newName, dbInfo);
    
    this.saveRegistryFromIndex();
    return true;
  }
}
