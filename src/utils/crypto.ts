/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as crypto from 'crypto';
import { Transform } from 'stream';

export class Crypto {
  private static readonly ENCRYPTION_KEY = Buffer.from('ZeroDB_2024_SecureKey!@#$%');
  private static readonly MAGIC_BYTES = Buffer.from([0x5A, 0x45, 0x44, 0x42]);
  private static readonly VERSION = 1;

  static hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  static xor(data: Buffer, offset: number = 0): Buffer {
    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ this.ENCRYPTION_KEY[(offset + i) % this.ENCRYPTION_KEY.length];
    }
    return result;
  }

  /**
   * Büyük dosyalar için XOR Transform Stream oluşturur
   */
  static createXorStream(startOffset: number = 0): Transform {
    let currentOffset = startOffset;
    return new Transform({
      transform(chunk, encoding, callback) {
        const processed = Crypto.xor(chunk, currentOffset);
        currentOffset += chunk.length;
        callback(null, processed);
      }
    });
  }

  static pack(content: string): Buffer {
    const data = this.xor(Buffer.from(content, 'utf8'));
    const header = Buffer.alloc(9);
    this.MAGIC_BYTES.copy(header, 0);
    header.writeUInt8(this.VERSION, 4);
    header.writeUInt32BE(data.length, 5);
    return Buffer.concat([header, data]);
  }

  static unpack(buffer: Buffer): string {
    if (buffer.length === 0) return '';
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
