/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export declare class CRC32 {
    private static readonly TABLE;
    static compute(data: string): number;
    static verify(data: string, expectedCrc: number): boolean;
    static toHex(crc: number): string;
}
//# sourceMappingURL=crc32.d.ts.map