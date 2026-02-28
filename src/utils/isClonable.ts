export const isCloneable = (val: unknown): boolean => {
    if (val === null || val === undefined) return true
    if (typeof val === 'function') return false
    if (typeof Element !== 'undefined' && val instanceof Element) return false
    if (typeof val === 'object') {
        // check for circular via known RHF patterns
        return !('__reactFiber' in (val as object))
    }
    return true
}
