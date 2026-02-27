import { RefObject } from "react"
import { FieldValues, FormState } from "react-hook-form"
import { isProxyable } from "./utils/isProxyable";
import { PathMeta } from "./types/pathMeta";

export function createProxy<TFieldValues extends FieldValues = FieldValues>(
    obj: Partial<FormState<TFieldValues>> & { values: TFieldValues },
    watchedKeys: RefObject<Set<string>>,
    watchedMeta: RefObject<Map<string, PathMeta>>,
    path = '',
    parentMarkNonLeaf: VoidFunction | null = null
) {
    const allowedProps = new Set(['length', 'size', 'name']);

    const proxy = new Proxy(obj, {
        get(target, prop) {
            if (typeof prop !== 'string') return Reflect.get(target, prop);

            // A child prop is being accessed, so tell the parent it's not a leaf
            parentMarkNonLeaf?.()

            const value = Reflect.get(target, prop);

            // Only track actual data properties that represent form values
            const isBuiltIn = !allowedProps.has(prop) && (
                typeof value === 'function' ||
                Object.prototype.hasOwnProperty.call(Object.getPrototypeOf(target) ?? {}, prop)
            )

            const fullPath = path ? `${path}.${prop}` : prop

            if (!isBuiltIn) {
                watchedKeys.current.add(fullPath)
                // Assume leaf until a child is accessed
                watchedMeta.current.set(fullPath, { isLeaf: true })
            }

            // Always return a proxy if possible, so we can detect deeper access
            // We no longer check the value type to decide isLeaf
            if (isProxyable(value)) {
                return createProxy(
                    value,
                    watchedKeys,
                    watchedMeta,
                    fullPath,
                    // If anything inside fullPath is accessed, mark fullPath as non-leaf
                    () => watchedMeta.current.set(fullPath, { isLeaf: false })
                )
            }

            return value
        }
    })

    return proxy
}