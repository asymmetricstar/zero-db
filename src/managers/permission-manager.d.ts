/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { PermissionType } from '../types';
export declare class PermissionManager {
    private permission;
    private isGrand;
    constructor(permission: number, isGrand?: boolean);
    hasAccess(permissionType: PermissionType): boolean;
    hasAnyAccess(permissionTypes: PermissionType[]): boolean;
    hasAllAccess(permissionTypes: PermissionType[]): boolean;
    getPermissionBits(): number;
    getPermissionObject(): Record<PermissionType, boolean>;
    static fromObject(perms: Partial<Record<PermissionType, boolean>>): number;
    static fromArray(perms: PermissionType[]): number;
    static fromBits(...bits: number[]): number;
    static allGranted(): number;
    static all(): number;
    static noneGranted(): number;
    static none(): number;
}
//# sourceMappingURL=permission-manager.d.ts.map