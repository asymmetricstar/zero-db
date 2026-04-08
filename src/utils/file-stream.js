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
exports.FileStreamReader = void 0;
const fs = __importStar(require("fs"));
const MAGIC_BYTES = Buffer.from([0x5A, 0x45, 0x44, 0x42]);
const VERSION = 1;
const ENCRYPTION_KEY = Buffer.from('ZeroDB_2024_SecureKey!@#$%');
function xorDecrypt(data) {
    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
    }
    return result;
}
class FileStreamReader {
    static readLineByLine(filePath, callback) {
        const fd = fs.openSync(filePath, 'r');
        const stats = fs.fstatSync(fd);
        const fileSize = stats.size;
        if (fileSize < 8) {
            fs.closeSync(fd);
            return;
        }
        const headerCheck = Buffer.alloc(4);
        fs.readSync(fd, headerCheck, 0, 4, 0);
        let content;
        if (headerCheck.equals(MAGIC_BYTES)) {
            const versionBuf = Buffer.alloc(1);
            fs.readSync(fd, versionBuf, 0, 1, 4);
            const version = versionBuf[0];
            const lengthBuf = Buffer.alloc(4);
            fs.readSync(fd, lengthBuf, 0, 4, 5);
            const dataLength = lengthBuf.readUInt32BE(0);
            if (version === VERSION && dataLength > 0 && dataLength <= fileSize - 9) {
                const encryptedData = Buffer.alloc(dataLength);
                fs.readSync(fd, encryptedData, 0, dataLength, 9);
                const decrypted = xorDecrypt(encryptedData);
                content = decrypted.toString('utf8');
            }
            else {
                fs.closeSync(fd);
                return;
            }
        }
        else {
            const plainBuffer = Buffer.alloc(fileSize);
            fs.readSync(fd, plainBuffer, 0, fileSize, 0);
            content = plainBuffer.toString('utf8');
        }
        fs.closeSync(fd);
        if (!content)
            return;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.startsWith(':'))
                continue;
            const result = callback(line, i);
            if (result === false) {
                return;
            }
        }
    }
    static readLinesInRange(filePath, startLine, endLine) {
        const results = [];
        let currentLine = 0;
        this.readLineByLine(filePath, (line, lineIndex) => {
            if (lineIndex >= startLine && lineIndex <= endLine) {
                results.push(line);
            }
            if (lineIndex > endLine) {
                return false;
            }
            return true;
        });
        return results;
    }
    static readSpecificLines(filePath, lineNumbers) {
        const targetLines = new Set(lineNumbers);
        const results = new Map();
        this.readLineByLine(filePath, (line, lineIndex) => {
            if (targetLines.has(lineIndex)) {
                results.set(lineIndex, line);
            }
            if (results.size === targetLines.size) {
                return false;
            }
            return true;
        });
        return results;
    }
    static getLineCount(filePath) {
        let count = 0;
        this.readLineByLine(filePath, () => {
            count++;
            return true;
        });
        return count;
    }
}
exports.FileStreamReader = FileStreamReader;
FileStreamReader.BUFFER_SIZE = 1024 * 1024;
//# sourceMappingURL=file-stream.js.map