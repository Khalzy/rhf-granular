import { isCloneable } from "./isClonable"

export const safeClone = <T>(val: T): T => {
    try {
        return structuredClone(val)
    } catch {
        if (Array.isArray(val)) return val.map(safeClone) as T
        if (val !== null && typeof val === 'object') {
            return Object.fromEntries(
                Object.entries(val as object)
                    .filter(([, v]) => isCloneable(v))
                    .map(([k, v]) => [k, safeClone(v)])
            ) as T
        }
        return val
    }
}