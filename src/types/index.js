"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_NAMES = exports.PERMISSION_BITS = void 0;
exports.PERMISSION_BITS = {
    add: 1 << 0,
    delete: 1 << 1,
    list: 1 << 2,
    update: 1 << 3,
    create: 1 << 4,
    drop: 1 << 5,
    rename: 1 << 6
};
exports.PERMISSION_NAMES = {
    [1 << 0]: 'add',
    [1 << 1]: 'delete',
    [1 << 2]: 'list',
    [1 << 3]: 'update',
    [1 << 4]: 'create',
    [1 << 5]: 'drop',
    [1 << 6]: 'rename'
};
//# sourceMappingURL=index.js.map