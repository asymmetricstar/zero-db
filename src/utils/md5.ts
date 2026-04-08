/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import { Crypto } from './crypto';

export class MD5 {
  static hash(input: string): string {
    return Crypto.hash(input);
  }
}
