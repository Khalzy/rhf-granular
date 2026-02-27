import { RefObject } from "react";
import { FieldValues, FormState, get } from "react-hook-form";
import { PathMeta } from "../types/pathMeta";
import { shallow } from "./shallow";

export function hasWatchedKeysChanged<T, TFieldValues extends FieldValues = FieldValues>(
    watchedKeys: RefObject<Set<string>>,
    watchedMeta: RefObject<Map<string, PathMeta>>,
    currentState: Partial<FormState<TFieldValues>>,
    lastSnapshotState: RefObject<Partial<FormState<TFieldValues>> & { values: TFieldValues }>,
    stableEqualityFn?: (a?: T | undefined, b?: T | null | undefined) => boolean
) {
    const equalityFn = stableEqualityFn ?? shallow

    return Array.from(watchedKeys.current ?? new Set()).some((path) => {
        if (!watchedMeta.current.get(path)?.isLeaf) return false;
        const current = get(currentState, path)
        const previous = get(lastSnapshotState.current, path)
        return !equalityFn(previous, current)
    })
}