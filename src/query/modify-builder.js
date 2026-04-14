"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifyBuilder = void 0;
const event_manager_1 = require("../utils/event-manager");
class ModifyBuilder {
    constructor(dbName, tableName, tableManager, dataManager, permissionManager) {
        this.modifications = [];
        this.dbName = dbName;
        this.tableName = tableName;
        this.tableManager = tableManager;
        this.dataManager = dataManager;
        this.permissionManager = permissionManager;
    }
    addField(fieldName, type, options = {}) {
        this.modifications.push({ type: 'add', fieldName, fieldType: type, options });
        return this;
    }
    dropField(fieldName) {
        this.modifications.push({ type: 'drop', fieldName });
        return this;
    }
    renameField(oldName, newName) {
        this.modifications.push({ type: 'rename', fieldName: oldName, newFieldName: newName });
        return this;
    }
    modifyField(fieldName, type, options = {}) {
        this.modifications.push({ type: 'modify', fieldName, fieldType: type, options });
        return this;
    }
    async commit() {
        try {
            if (!this.permissionManager.hasAccess('rename')) {
                event_manager_1.EventManager.error('Permission denied: modify table structure requires rename permission');
                return false;
            }
            for (const mod of this.modifications) {
                switch (mod.type) {
                    case 'add':
                        this.tableManager.addField(this.dbName, this.tableName, mod.fieldName, mod.fieldType, mod.options);
                        break;
                    case 'drop':
                        this.tableManager.dropField(this.dbName, this.tableName, mod.fieldName);
                        break;
                    case 'rename':
                        const oldFileName = this.tableManager.getFieldFileName(this.dbName, this.tableName, mod.fieldName);
                        if (oldFileName) {
                            this.tableManager.renameField(this.dbName, this.tableName, mod.fieldName, mod.newFieldName, oldFileName);
                        }
                        else {
                            event_manager_1.EventManager.error(`Field '${mod.fieldName}' not found for rename`);
                        }
                        break;
                    case 'modify':
                        this.tableManager.modifyField(this.dbName, this.tableName, mod.fieldName, mod.fieldType, mod.options);
                        break;
                }
            }
            // Clear pool and cache to reflect changes
            this.dataManager.clearPoolForTable(this.dbName, this.tableName);
            event_manager_1.EventManager.info(`Table '${this.tableName}' modified successfully`, { modifications: this.modifications.length });
            this.modifications = [];
            return true;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to commit table modifications`, { error: e.message });
            return false;
        }
    }
}
exports.ModifyBuilder = ModifyBuilder;
//# sourceMappingURL=modify-builder.js.map