/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as path from 'path';

/**
 * Checks if a given path is a network path (UNC path on Windows).
 * @param p The path to check
 * @returns true if it's a network path, false otherwise
 */
export function isNetworkPath(p: string): boolean {
  const resolvedPath = path.resolve(p);
  // Windows UNC paths (e.g. \\server\share)
  if (resolvedPath.startsWith('\\\\') || resolvedPath.startsWith('//') || resolvedPath.startsWith('\\\\?\\')) {
    return true;
  }
  return false;
}
