/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { FieldType } from '../types';
import { TableManager } from '../managers/table-manager';
import { DataManager } from '../managers/data-manager';
import { PermissionManager } from '../managers/permission-manager';
export declare class ModifyBuilder {
    private modifications;
    private dbName;
    private tableName;
    private tableManager;
    private dataManager;
    private permissionManager;
    constructor(dbName: string, tableName: string, tableManager: TableManager, dataManager: DataManager, permissionManager: PermissionManager);
    addField(fieldName: string, type: FieldType, options?: {
        isAuto?: boolean;
        allowNull?: boolean;
        defaultValue?: string;
        maxLength?: number;
    }): ModifyBuilder;
    dropField(fieldName: string): ModifyBuilder;
    renameField(oldName: string, newName: string): ModifyBuilder;
    modifyField(fieldName: string, type: FieldType, options?: {
        isAuto?: boolean;
        allowNull?: boolean;
        defaultValue?: string;
        maxLength?: number;
    }): ModifyBuilder;
    commit(): Promise<boolean>;
}
//# sourceMappingURL=modify-builder.d.ts.map