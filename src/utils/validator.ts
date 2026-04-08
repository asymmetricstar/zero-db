/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

export type ZeroDBResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ZeroDBResult<T> {
  return { ok: true, data };
}

export function err<T>(error: string): ZeroDBResult<T> {
  return { ok: false, error };
}

export function safe<T>(fn: () => T): ZeroDBResult<T> {
  try {
    return ok(fn());
  } catch (e: any) {
    return err(e.message || 'Unknown error');
  }
}

export async function safeAsync<T>(fn: () => Promise<T>): Promise<ZeroDBResult<T>> {
  try {
    return ok(await fn());
  } catch (e: any) {
    return err(e.message || 'Unknown error');
  }
}

export class ZeroDBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZeroDBError';
  }
}
