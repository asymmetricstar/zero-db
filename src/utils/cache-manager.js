"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
class CacheManager {
    constructor(maxMB = 64) {
        this.maxBytes = maxMB * 1024 * 1024;
        this.currentBytes = 0;
        this.store = new Map();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
        this.nameMap = new Map();
    }
    setNameMapping(hashName, originalName) {
        this.nameMap.set(hashName, originalName);
    }
    getOriginalName(hashName) {
        return this.nameMap.get(hashName) || null;
    }
    getNameMapping() {
        return new Map(this.nameMap);
    }
    clearNameMappings() {
        this.nameMap.clear();
    }
    get(key) {
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
    set(key, data) {
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
    setDirty(key) {
        const entry = this.store.get(key);
        if (entry) {
            entry.dirty = true;
        }
    }
    isDirty(key) {
        const entry = this.store.get(key);
        return entry?.dirty ?? false;
    }
    getDirtyEntries() {
        const dirty = new Map();
        for (const [key, entry] of this.store) {
            if (entry.dirty) {
                dirty.set(key, entry.data);
            }
        }
        return dirty;
    }
    markClean(key) {
        const entry = this.store.get(key);
        if (entry) {
            entry.dirty = false;
        }
    }
    invalidate(key) {
        const entry = this.store.get(key);
        if (entry) {
            this.currentBytes -= entry.size;
            this.store.delete(key);
            this.removeAccessOrder(key);
        }
    }
    invalidatePattern(pattern) {
        const keysToDelete = [];
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.invalidate(key);
        }
    }
    clear() {
        this.store.clear();
        this.currentBytes = 0;
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
        this.nameMap.clear();
    }
    getStats() {
        const total = this.hits + this.misses;
        return {
            usedMB: this.currentBytes / 1024 / 1024,
            maxMB: this.maxBytes / 1024 / 1024,
            entries: this.store.size,
            hits: this.hits,
            misses: this.misses
        };
    }
    has(key) {
        return this.store.has(key);
    }
    evictOldest() {
        if (this.accessOrder.length === 0)
            return;
        const oldestKey = this.accessOrder.shift();
        const entry = this.store.get(oldestKey);
        if (entry) {
            this.currentBytes -= entry.size;
            this.store.delete(oldestKey);
        }
    }
    touchAccessOrder(key) {
        this.removeAccessOrder(key);
        this.accessOrder.push(key);
    }
    removeAccessOrder(key) {
        const idx = this.accessOrder.indexOf(key);
        if (idx !== -1) {
            this.accessOrder.splice(idx, 1);
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map