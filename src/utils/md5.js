"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MD5 = void 0;
const crypto_1 = require("./crypto");
class MD5 {
    static hash(input) {
        return crypto_1.Crypto.hash(input);
    }
}
exports.MD5 = MD5;
//# sourceMappingURL=md5.js.map