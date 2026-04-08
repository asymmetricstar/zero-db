/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { SelectResult } from '../types';
export type JoinType = 'inner' | 'left' | 'right' | 'cross';
export interface JoinConfig {
    type: JoinType;
    table: string;
    on: Record<string, string>;
}
export declare class JoinEngine {
    executeJoin(leftResults: SelectResult[], rightResults: SelectResult[], config: JoinConfig): SelectResult[];
    validateJoin(config: JoinConfig, availableTables: string[]): boolean;
}
//# sourceMappingURL=join-engine.d.ts.map