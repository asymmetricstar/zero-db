/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { Transform } from 'stream';
export declare class Crypto {
    private static readonly ENCRYPTION_KEY;
    private static readonly MAGIC_BYTES;
    private static readonly VERSION;
    static hash(input: string): string;
    static xor(data: Buffer, offset?: number): Buffer;
    /**
     * Büyük dosyalar için XOR Transform Stream oluşturur
     */
    static createXorStream(startOffset?: number): Transform;
    static pack(content: string): Buffer;
    static unpack(buffer: Buffer): string;
}
//# sourceMappingURL=crypto.d.ts.map