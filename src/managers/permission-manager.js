"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionManager = void 0;
const types_1 = require("../types");
class PermissionManager {
    constructor(permission, isGrand = false) {
        this.permission = permission;
        this.isGrand = isGrand;
    }
    hasAccess(permissionType) {
        // Grand yetkisi olan kullanıcılar tüm işlemlere izin sahiptir
        if (this.isGrand) {
            return true;
        }
        const bit = types_1.PERMISSION_BITS[permissionType];
        return (this.permission & bit) === bit;
    }
    hasAnyAccess(permissionTypes) {
        return permissionTypes.some(type => this.hasAccess(type));
    }
    hasAllAccess(permissionTypes) {
        return permissionTypes.every(type => this.hasAccess(type));
    }
    getPermissionBits() {
        return this.permission;
    }
    getPermissionObject() {
        const result = {};
        for (const type of Object.keys(types_1.PERMISSION_BITS)) {
            result[type] = this.hasAccess(type);
        }
        return result;
    }
    static fromObject(perms) {
        let bits = 0;
        for (const [type, granted] of Object.entries(perms)) {
            if (granted && types_1.PERMISSION_BITS[type]) {
                bits |= types_1.PERMISSION_BITS[type];
            }
        }
        return bits;
    }
    static fromArray(perms) {
        let bits = 0;
        for (const type of perms) {
            if (types_1.PERMISSION_BITS[type]) {
                bits |= types_1.PERMISSION_BITS[type];
            }
        }
        return bits;
    }
    static fromBits(...bits) {
        let result = 0;
        for (const bit of bits) {
            result |= bit;
        }
        return result;
    }
    static allGranted() {
        let bits = 0;
        for (const bit of Object.values(types_1.PERMISSION_BITS)) {
            bits |= bit;
        }
        return bits;
    }
    static all() {
        return PermissionManager.allGranted();
    }
    static noneGranted() {
        return 0;
    }
    static none() {
        return PermissionManager.noneGranted();
    }
}
exports.PermissionManager = PermissionManager;
//# sourceMappingURL=permission-manager.js.map