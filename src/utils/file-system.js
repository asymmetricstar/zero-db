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
exports.FileSystem = void 0;
const fs = __importStar(require("fs"));
const crc32_1 = require("./crc32");
class FileSystem {
    constructor(filePath) {
        this.cachedContent = null;
        this.cachedCrc = null;
        this.cachedRecords = null;
        this.LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;
        this.filePath = filePath;
    }
    exists() {
        return fs.existsSync(this.filePath);
    }
    readContent() {
        if (this.cachedContent !== null) {
            return this.cachedContent;
        }
        let content = fs.readFileSync(this.filePath, "utf8");
        if (content.charCodeAt(0) === 0xfeff) {
            content = content.slice(1);
        }
        const firstLine = content.split("\n")[0].trim();
        if (firstLine.startsWith("crc32:")) {
            const endIdx = firstLine.indexOf(" ", 5);
            this.cachedCrc = endIdx !== -1 ? firstLine.substring(5, endIdx) : firstLine.substring(5);
            this.cachedContent = content.split("\n").slice(1).join("\n");
        }
        else {
            this.cachedContent = content;
        }
        return this.cachedContent;
    }
    readRecords() {
        if (this.cachedRecords !== null) {
            return this.cachedRecords;
        }
        const content = this.readContent();
        const records = new Map();
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            const firstColon = trimmed.indexOf(":");
            const secondColon = trimmed.indexOf(":", firstColon + 1);
            if (firstColon !== -1 && secondColon !== -1) {
                const lineNum = parseInt(trimmed.substring(firstColon + 1, secondColon).trim(), 10);
                if (!isNaN(lineNum)) {
                    const value = trimmed.substring(secondColon + 1).trim();
                    records.set(lineNum, value);
                }
            }
        }
        if (this.isLargeFile()) {
            this.cachedRecords = records;
        }
        return records;
    }
    writeContent(content) {
        if (!content.endsWith("\n"))
            content += "\n";
        const crc = crc32_1.CRC32.compute(content);
        const total = this.countRecords(content);
        const timestamp = Date.now();
        const header = `crc32:${crc32_1.CRC32.toHex(crc)} ; total:${total} ; timestamp:${timestamp};\n`;
        const finalContent = header + content;
        const tempPath = this.filePath + ".tmp";
        fs.writeFileSync(tempPath, finalContent, "utf8");
        fs.renameSync(tempPath, this.filePath);
        this.cachedContent = content;
        this.cachedCrc = crc32_1.CRC32.toHex(crc);
        this.cachedRecords = null;
    }
    appendContent(append) {
        const existing = this.exists() ? this.readContent() : "";
        this.writeContent(existing + append);
    }
    updateRecords(linesToUpdate, fieldName, newValue) {
        const content = this.readContent();
        const lines = content.split("\n");
        const newLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                newLines.push(line);
                continue;
            }
            const firstColon = trimmed.indexOf(":");
            const secondColon = trimmed.indexOf(":", firstColon + 1);
            if (firstColon !== -1 && secondColon !== -1) {
                const lineField = trimmed.substring(0, firstColon).trim();
                const lineNum = parseInt(trimmed.substring(firstColon + 1, secondColon).trim(), 10);
                if (lineField === fieldName && !isNaN(lineNum) && linesToUpdate.has(lineNum)) {
                    newLines.push(`${fieldName}:${lineNum}:${newValue}`);
                    continue;
                }
            }
            newLines.push(line);
        }
        this.writeContent(newLines.join("\n"));
    }
    removeRecords(linesToRemove) {
        const content = this.readContent();
        const lines = content.split("\n");
        const newLines = [];
        let currentRecordLineNum = null;
        let recordLines = [];
        const flushRecord = () => {
            if (recordLines.length > 0 && currentRecordLineNum !== null) {
                if (!linesToRemove.has(currentRecordLineNum)) {
                    newLines.push(...recordLines);
                    newLines.push("");
                }
            }
            recordLines = [];
            currentRecordLineNum = null;
        };
        for (const line of lines) {
            if (line.trim() === "") {
                flushRecord();
                continue;
            }
            const firstColon = line.indexOf(":");
            const secondColon = line.indexOf(":", firstColon + 1);
            if (firstColon !== -1 && secondColon !== -1) {
                const lineNum = parseInt(line.substring(firstColon + 1, secondColon), 10);
                if (!isNaN(lineNum)) {
                    if (currentRecordLineNum !== null && currentRecordLineNum !== lineNum) {
                        flushRecord();
                    }
                    currentRecordLineNum = lineNum;
                }
            }
            recordLines.push(line);
        }
        flushRecord();
        this.writeContent(newLines.join("\n").replace(/\n+$/, "\n"));
    }
    invalidate() {
        this.cachedContent = null;
        this.cachedCrc = null;
        this.cachedRecords = null;
    }
    getCrc() {
        if (this.cachedCrc === null) {
            this.readContent();
        }
        return this.cachedCrc;
    }
    isDirty() {
        if (!this.exists())
            return false;
        const currentCrc = this.getCrc();
        let content = fs.readFileSync(this.filePath, "utf8");
        if (content.charCodeAt(0) === 0xfeff)
            content = content.slice(1);
        const firstLine = content.split("\n")[0].trim();
        if (firstLine.startsWith("crc32:")) {
            const endIdx = firstLine.indexOf(" ", 5);
            const fileCrc = endIdx !== -1 ? firstLine.substring(5, endIdx) : firstLine.substring(5);
            return currentCrc !== fileCrc;
        }
        return false;
    }
    countRecords(content) {
        let maxNum = 0;
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            const firstColon = trimmed.indexOf(":");
            const secondColon = trimmed.indexOf(":", firstColon + 1);
            if (firstColon !== -1 && secondColon !== -1) {
                const num = parseInt(trimmed.substring(firstColon + 1, secondColon).trim(), 10);
                if (!isNaN(num) && num > maxNum)
                    maxNum = num;
            }
        }
        return maxNum;
    }
    isLargeFile() {
        try {
            const stats = fs.statSync(this.filePath);
            return stats.size >= this.LARGE_FILE_THRESHOLD;
        }
        catch {
            return false;
        }
    }
}
exports.FileSystem = FileSystem;
//# sourceMappingURL=file-system.js.map