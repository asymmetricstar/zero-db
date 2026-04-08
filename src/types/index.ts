/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

export type FieldType = 'auto' | 'string' | 'number' | 'boolean' | 'timestamp';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  isAuto: boolean;
  allowNull: boolean;
  defaultValue: string;
  maxLength: number;
  fileName: string;
}

export interface CreateFieldDefinition {
  name: string;
  type: FieldType;
  option?: {
    isAuto?: boolean;
    allowNull?: boolean;
    defaultValue?: string;
    maxLength?: number;
  };
}

export interface TableDefinition {
  dbName: string;
  tableName: string;
  fields: Map<string, FieldDefinition>;
}

export interface UserCredentials {
  username: string;
  password: string;
  permission: number;
  isGrand?: boolean;
}

export interface DatabaseCredentials {
  dbName: string;
  tables: string[];
  users: Map<string, UserCredentials>;
  isPublic: boolean;
  owner: string[];
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: string;
}

export interface SelectResult {
  [key: string]: string;
}

export type PermissionType = 'add' | 'delete' | 'list' | 'update' | 'create' | 'drop' | 'rename';

export const PERMISSION_BITS: Record<PermissionType, number> = {
  add: 1 << 0,
  delete: 1 << 1,
  list: 1 << 2,
  update: 1 << 3,
  create: 1 << 4,
  drop: 1 << 5,
  rename: 1 << 6
};

export const PERMISSION_NAMES: Record<number, PermissionType> = {
  [1 << 0]: 'add',
  [1 << 1]: 'delete',
  [1 << 2]: 'list',
  [1 << 3]: 'update',
  [1 << 4]: 'create',
  [1 << 5]: 'drop',
  [1 << 6]: 'rename'
};
