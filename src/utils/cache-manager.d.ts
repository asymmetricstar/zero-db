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
export declare class CacheManager {
    private maxBytes;
    private currentBytes;
    private store;
    private accessOrder;
    private hits;
    private misses;
    private nameMap;
    constructor(maxMB?: number);
    setNameMapping(hashName: string, originalName: string): void;
    getOriginalName(hashName: string): string | null;
    getNameMapping(): Map<string, string>;
    clearNameMappings(): void;
    get(key: string): string | null;
    set(key: string, data: string): void;
    setDirty(key: string): void;
    isDirty(key: string): boolean;
    getDirtyEntries(): Map<string, string>;
    markClean(key: string): void;
    invalidate(key: string): void;
    invalidatePattern(pattern: string): void;
    clear(): void;
    getStats(): CacheStats;
    has(key: string): boolean;
    private evictOldest;
    private touchAccessOrder;
    private removeAccessOrder;
}
//# sourceMappingURL=cache-manager.d.ts.map