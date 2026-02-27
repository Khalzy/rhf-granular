export const isProxyable = <T extends object>(value: T): value is T => {
    if (value === null || typeof value !== 'object') return false;

    if (value instanceof Date || value instanceof RegExp) return false;

    // DOM Elements (RHF 'errors' refs)
    if (typeof Element !== 'undefined' && value instanceof Element) return false;

    // File APIs
    if (typeof File !== 'undefined' && value instanceof File) return false;
    if (typeof FileList !== 'undefined' && value instanceof FileList) return false;

    if (value instanceof Promise) return false

    return true;
};