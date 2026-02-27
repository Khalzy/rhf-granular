import { RefObject } from "react";
import { FieldValues, FormState } from "react-hook-form";
import { createProxy } from "./createProxy";
import { PathMeta } from "./types/pathMeta";

export function selectWithProxy<T, TFieldValues extends FieldValues>(
    selector: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T,
    state: Partial<FormState<TFieldValues>> & { values: TFieldValues },
    watchedKeys: RefObject<Set<string>>,
    watchedMeta: RefObject<Map<string, PathMeta>>,
) {
    watchedKeys.current?.clear();
    watchedMeta.current?.clear();
    const proxy = createProxy(state, watchedKeys, watchedMeta, '')

    try {
        return selector(proxy)
    } catch {
        // Selector might error on proxy access (e.g., Object.keys, JSON.stringify)
        // Fallback to subscribing to common keys
        watchedKeys.current = new Set(['values', 'errors', 'isDirty', 'isValid', 'touchedFields'])
        return selector(state)
    }
}
