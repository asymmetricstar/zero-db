/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

export class CRC32 {
  private static readonly TABLE: number[] = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table.push(c >>> 0);
    }
    return table;
  })();

  static compute(data: string): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      const byte = data.charCodeAt(i) & 0xFF;
      crc = (crc >>> 8) ^ this.TABLE[(crc ^ byte) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  static verify(data: string, expectedCrc: number): boolean {
    return this.compute(data) === expectedCrc;
  }

  static toHex(crc: number): string {
    return (crc >>> 0).toString(16).padStart(8, '0');
  }
}
