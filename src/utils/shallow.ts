/* eslint-disable @typescript-eslint/no-explicit-any */

export function shallow<T>(objA: T, objB: T): boolean {
    if (Object.is(objA, objB)) {
        return true;
    }

    if (
        typeof objA !== 'object' ||
        objA === null ||
        typeof objB !== 'object' ||
        objB === null
    ) {
        return false;
    }

    if (Array.isArray(objA) && Array.isArray(objB)) {
        if (objA.length !== objB.length) return false;
        for (let i = 0; i < objA.length; i++) {
            if (!shallow(objA[i], objB[i])) return false;
        }
        return true;
    }

    if (objA instanceof Map && objB instanceof Map) {
        if (objA.size !== objB.size) return false;
        for (const [k, v] of objA) {
            if (!objB.has(k) || !Object.is(v, objB.get(k))) return false;
        }
        return true;
    }

    if (objA instanceof Set && objB instanceof Set) {
        if (objA.size !== objB.size) return false;
        for (const v of objA) {
            if (!objB.has(v)) return false;
        }
        return true;
    }

    if (objA instanceof Date && objB instanceof Date) {
        return objA.getTime() === objB.getTime();
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.is((objA as any)[key], (objB as any)[key])) return false
    }

    return true;
}
