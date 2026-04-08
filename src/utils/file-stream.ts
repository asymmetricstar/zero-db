/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as fs from 'fs';

const MAGIC_BYTES = Buffer.from([0x5A, 0x45, 0x44, 0x42]);
const VERSION = 1;
const ENCRYPTION_KEY = Buffer.from('ZeroDB_2024_SecureKey!@#$%');

function xorDecrypt(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
  }
  return result;
}

export class FileStreamReader {
  private static readonly BUFFER_SIZE = 1024 * 1024;

  static readLineByLine(
    filePath: string,
    callback: (line: string, lineIndex: number) => boolean | void
  ): void {
    const fd = fs.openSync(filePath, 'r');
    const stats = fs.fstatSync(fd);
    const fileSize = stats.size;

    if (fileSize < 8) {
      fs.closeSync(fd);
      return;
    }

    const headerCheck = Buffer.alloc(4);
    fs.readSync(fd, headerCheck, 0, 4, 0);

    let content: string;

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
      } else {
        fs.closeSync(fd);
        return;
      }
    } else {
      const plainBuffer = Buffer.alloc(fileSize);
      fs.readSync(fd, plainBuffer, 0, fileSize, 0);
      content = plainBuffer.toString('utf8');
    }

    fs.closeSync(fd);

    if (!content) return;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith(':')) continue;
      const result = callback(line, i);
      if (result === false) {
        return;
      }
    }
  }

  static readLinesInRange(
    filePath: string,
    startLine: number,
    endLine: number
  ): string[] {
    const results: string[] = [];
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

  static readSpecificLines(
    filePath: string,
    lineNumbers: number[]
  ): Map<number, string> {
    const targetLines = new Set(lineNumbers);
    const results = new Map<number, string>();

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

  static getLineCount(filePath: string): number {
    let count = 0;
    this.readLineByLine(filePath, () => {
      count++;
      return true;
    });
    return count;
  }
}