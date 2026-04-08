"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crypto = void 0;
const crypto = __importStar(require("crypto"));
const stream_1 = require("stream");
class Crypto {
    static hash(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }
    static xor(data, offset = 0) {
        const result = Buffer.alloc(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ this.ENCRYPTION_KEY[(offset + i) % this.ENCRYPTION_KEY.length];
        }
        return result;
    }
    /**
     * Büyük dosyalar için XOR Transform Stream oluşturur
     */
    static createXorStream(startOffset = 0) {
        let currentOffset = startOffset;
        return new stream_1.Transform({
            transform(chunk, encoding, callback) {
                const processed = Crypto.xor(chunk, currentOffset);
                currentOffset += chunk.length;
                callback(null, processed);
            }
        });
    }
    static pack(content) {
        const data = this.xor(Buffer.from(content, 'utf8'));
        const header = Buffer.alloc(9);
        this.MAGIC_BYTES.copy(header, 0);
        header.writeUInt8(this.VERSION, 4);
        header.writeUInt32BE(data.length, 5);
        return Buffer.concat([header, data]);
    }
    static unpack(buffer) {
        if (buffer.length === 0)
            return '';
        if (buffer.length >= 9 && buffer.slice(0, 4).equals(this.MAGIC_BYTES)) {
            const dataLength = buffer.readUInt32BE(5);
            if (dataLength > 0 && dataLength <= buffer.length - 9) {
                const encrypted = buffer.slice(9, 9 + dataLength);
                return this.xor(encrypted).toString('utf8');
            }
        }
        return buffer.toString('utf8');
    }
}
exports.Crypto = Crypto;
Crypto.ENCRYPTION_KEY = Buffer.from('ZeroDB_2024_SecureKey!@#$%');
Crypto.MAGIC_BYTES = Buffer.from([0x5A, 0x45, 0x44, 0x42]);
Crypto.VERSION = 1;
//# sourceMappingURL=crypto.js.map