/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from "fs";
import { CRC32 } from "./crc32";

export class FileSystem {
  private filePath: string;
  private cachedContent: string | null = null;
  private cachedCrc: string | null = null;
  private cachedRecords: Map<number, string> | null = null;
  private readonly LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  readContent(): string {
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
    } else {
      this.cachedContent = content;
    }

    return this.cachedContent;
  }

  readRecords(): Map<number, string> {
    if (this.cachedRecords !== null) {
      return this.cachedRecords;
    }

    const content = this.readContent();
    const records = new Map<number, string>();
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

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

  writeContent(content: string): void {
    if (!content.endsWith("\n")) content += "\n";
    const crc = CRC32.compute(content);
    const total = this.countRecords(content);
    const timestamp = Date.now();
    const header = `crc32:${CRC32.toHex(crc)} ; total:${total} ; timestamp:${timestamp};\n`;
    const finalContent = header + content;
    const tempPath = this.filePath + ".tmp";
    fs.writeFileSync(tempPath, finalContent, "utf8");
    fs.renameSync(tempPath, this.filePath);

    this.cachedContent = content;
    this.cachedCrc = CRC32.toHex(crc);
    this.cachedRecords = null;
  }

  appendContent(append: string): void {
    const existing = this.exists() ? this.readContent() : "";
    this.writeContent(existing + append);
  }

  updateRecords(linesToUpdate: Set<number>, fieldName: string, newValue: string): void {
    const content = this.readContent();
    const lines = content.split("\n");
    const newLines: string[] = [];

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

  removeRecords(linesToRemove: Set<number>): void {
    const content = this.readContent();
    const lines = content.split("\n");
    const newLines: string[] = [];

    let currentRecordLineNum: number | null = null;
    let recordLines: string[] = [];

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

  invalidate(): void {
    this.cachedContent = null;
    this.cachedCrc = null;
    this.cachedRecords = null;
  }

  getCrc(): string | null {
    if (this.cachedCrc === null) {
      this.readContent();
    }
    return this.cachedCrc;
  }

  isDirty(): boolean {
    if (!this.exists()) return false;
    const currentCrc = this.getCrc();
    let content = fs.readFileSync(this.filePath, "utf8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const firstLine = content.split("\n")[0].trim();
    if (firstLine.startsWith("crc32:")) {
      const endIdx = firstLine.indexOf(" ", 5);
      const fileCrc = endIdx !== -1 ? firstLine.substring(5, endIdx) : firstLine.substring(5);
      return currentCrc !== fileCrc;
    }
    return false;
  }

  private countRecords(content: string): number {
    let maxNum = 0;
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const firstColon = trimmed.indexOf(":");
      const secondColon = trimmed.indexOf(":", firstColon + 1);
      if (firstColon !== -1 && secondColon !== -1) {
        const num = parseInt(trimmed.substring(firstColon + 1, secondColon).trim(), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return maxNum;
  }

  private isLargeFile(): boolean {
    try {
      const stats = fs.statSync(this.filePath);
      return stats.size >= this.LARGE_FILE_THRESHOLD;
    } catch {
      return false;
    }
  }
}
