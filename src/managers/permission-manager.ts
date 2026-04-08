/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import { PERMISSION_BITS, PermissionType } from '../types';
import { ZeroDBError } from '../utils/validator';

export class PermissionManager {
  private permission: number;
  private isGrand: boolean;

  constructor(permission: number, isGrand: boolean = false) {
    this.permission = permission;
    this.isGrand = isGrand;
  }

  hasAccess(permissionType: PermissionType): boolean {
    // Grand yetkisi olan kullanıcılar tüm işlemlere izin sahiptir
    if (this.isGrand) {
      return true;
    }
    
    const bit = PERMISSION_BITS[permissionType];
    return (this.permission & bit) === bit;
  }

  hasAnyAccess(permissionTypes: PermissionType[]): boolean {
    return permissionTypes.some(type => this.hasAccess(type));
  }

  hasAllAccess(permissionTypes: PermissionType[]): boolean {
    return permissionTypes.every(type => this.hasAccess(type));
  }

  getPermissionBits(): number {
    return this.permission;
  }

  getPermissionObject(): Record<PermissionType, boolean> {
    const result = {} as Record<PermissionType, boolean>;
    for (const type of Object.keys(PERMISSION_BITS) as PermissionType[]) {
      result[type] = this.hasAccess(type);
    }
    return result;
  }

  static fromObject(perms: Partial<Record<PermissionType, boolean>>): number {
    let bits = 0;
    for (const [type, granted] of Object.entries(perms)) {
      if (granted && PERMISSION_BITS[type as PermissionType]) {
        bits |= PERMISSION_BITS[type as PermissionType];
      }
    }
    return bits;
  }

  static fromBits(...bits: number[]): number {
    let result = 0;
    for (const bit of bits) {
      result |= bit;
    }
    return result;
  }

  static allGranted(): number {
    let bits = 0;
    for (const bit of Object.values(PERMISSION_BITS)) {
      bits |= bit;
    }
    return bits;
  }

  static all(): number {
    return PermissionManager.allGranted();
  }

  static noneGranted(): number {
    return 0;
  }

  static none(): number {
    return PermissionManager.noneGranted();
  }
}