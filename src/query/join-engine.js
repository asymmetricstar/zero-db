"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinEngine = void 0;
class JoinEngine {
    executeJoin(leftResults, rightResults, config) {
        const results = [];
        if (config.type === 'cross') {
            for (const left of leftResults) {
                for (const right of rightResults) {
                    results.push({ ...left, ...right });
                }
            }
            return results;
        }
        const [leftField, rightField] = Object.entries(config.on)[0] || [];
        if (!leftField || !rightField) {
            return leftResults;
        }
        const rightMap = new Map();
        for (const right of rightResults) {
            const key = right[rightField];
            if (key !== undefined) {
                if (!rightMap.has(key)) {
                    rightMap.set(key, []);
                }
                rightMap.get(key).push(right);
            }
        }
        for (const left of leftResults) {
            const key = left[leftField];
            const matchingRight = rightMap.get(key);
            if (matchingRight) {
                for (const right of matchingRight) {
                    results.push({ ...left, ...right });
                }
            }
            else if (config.type === 'left') {
                results.push({ ...left });
            }
        }
        if (config.type === 'right') {
            const leftMap = new Map();
            for (const left of leftResults) {
                const key = left[leftField];
                if (key !== undefined) {
                    if (!leftMap.has(key)) {
                        leftMap.set(key, []);
                    }
                    leftMap.get(key).push(left);
                }
            }
            for (const right of rightResults) {
                const key = right[rightField];
                const matchingLeft = leftMap.get(key);
                if (!matchingLeft) {
                    results.push({ ...right });
                }
            }
        }
        return results;
    }
    validateJoin(config, availableTables) {
        if (!availableTables.includes(config.table)) {
            return false;
        }
        if (!config.on || Object.keys(config.on).length === 0) {
            return config.type === 'cross';
        }
        return true;
    }
}
exports.JoinEngine = JoinEngine;
//# sourceMappingURL=join-engine.js.map