/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

export interface CacheEntry {
  data: string;
  lastAccess: number;
  size: number;
  dirty: boolean;
}

export interface CacheStats {
  usedMB: number;
  maxMB: number;
  entries: number;
  hits: number;
  misses: number;
}

export class CacheManager {
  private maxBytes: number;
  private currentBytes: number;
  private store: Map<string, CacheEntry>;
  private accessOrder: string[];
  private hits: number;
  private misses: number;
  private nameMap: Map<string, string>;

  constructor(maxMB: number = 64) {
    this.maxBytes = maxMB * 1024 * 1024;
    this.currentBytes = 0;
    this.store = new Map();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.nameMap = new Map();
  }

  setNameMapping(hashName: string, originalName: string): void {
    this.nameMap.set(hashName, originalName);
  }

  getOriginalName(hashName: string): string | null {
    return this.nameMap.get(hashName) || null;
  }

  getNameMapping(): Map<string, string> {
    return new Map(this.nameMap);
  }

  clearNameMappings(): void {
    this.nameMap.clear();
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    this.hits++;
    entry.lastAccess = Date.now();
    this.touchAccessOrder(key);
    return entry.data;
  }

  set(key: string, data: string): void {
    const dataSize = Buffer.byteLength(data, 'utf8');

    if (dataSize > this.maxBytes) {
      return;
    }

    const existing = this.store.get(key);
    if (existing) {
      this.currentBytes -= existing.size;
      this.store.delete(key);
      this.removeAccessOrder(key);
    }

    while (this.currentBytes + dataSize > this.maxBytes && this.store.size > 0) {
      this.evictOldest();
    }

    this.store.set(key, {
      data,
      lastAccess: Date.now(),
      size: dataSize,
      dirty: false
    });
    this.currentBytes += dataSize;
    this.accessOrder.push(key);
  }

  setDirty(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.dirty = true;
    }
  }

  isDirty(key: string): boolean {
    const entry = this.store.get(key);
    return entry?.dirty ?? false;
  }

  getDirtyEntries(): Map<string, string> {
    const dirty = new Map<string, string>();
    for (const [key, entry] of this.store) {
      if (entry.dirty) {
        dirty.set(key, entry.data);
      }
    }
    return dirty;
  }

  markClean(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.dirty = false;
    }
  }

  invalidate(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      this.currentBytes -= entry.size;
      this.store.delete(key);
      this.removeAccessOrder(key);
    }
  }

  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.invalidate(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.currentBytes = 0;
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    this.nameMap.clear();
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      usedMB: this.currentBytes / 1024 / 1024,
      maxMB: this.maxBytes / 1024 / 1024,
      entries: this.store.size,
      hits: this.hits,
      misses: this.misses
    };
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift()!;
    const entry = this.store.get(oldestKey);
    if (entry) {
      this.currentBytes -= entry.size;
      this.store.delete(oldestKey);
    }
  }

  private touchAccessOrder(key: string): void {
    this.removeAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }
}
