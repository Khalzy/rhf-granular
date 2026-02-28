import { addSubscriberCallback } from "./addSubscriberCallback";
import { getManager } from "./getManager";
import { hasWatchedKeysChanged } from "./utils/hasWatchedKeysChanged";
import { patchFormState } from "./utils/patchFormState";
import { PathMeta } from "./types/pathMeta";
import { registerSubscriber } from "./registerSubscriber";
import { removeSubscriber } from "./removeSubscriber";
import { safeClone } from "./utils/safeClone";
import { safeEquality } from "./utils/safeEquality";
import { selectWithProxy } from "./selectWIthProxy";
import { type Control, type FieldValues, type FormState } from "react-hook-form";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useStableRef } from "./hooks/useStableRef";
import type { EqualityFn, Subscriber } from "./types/manager";

/**
 * Subscribe to a derived value from form state with equality-gated re-renders.
 * The component only re-renders when the selector's return value changes.
 *
 * @example
 * const isEnterprise = useFormSelector(control, s => s.values.plan === 'enterprise');
 *
 * @example
 * const price = useFormSelector(control, ({ values }) => {
 *   const base = values.plan === 'enterprise' ? 99 : 29;
 *   return base * values.seats;
 * });
 */

export function useFormSelector<T, TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>,
    selector: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T,
    options?: {
        equalityFn?: EqualityFn<T>,
    }
): T | undefined {
    const stableSelector = useStableRef(selector);
    const stableEqualityFn = useStableRef<[T | undefined | null, T | undefined | null], boolean>(
        (a, b) => safeEquality(a, b, options?.equalityFn)
    );

    const watchedMeta = useRef<Map<string, PathMeta>>(new Map());
    const watchedKeys = useRef<Set<string>>(new Set());

    const draftWatchedMeta = useRef<Map<string, PathMeta>>(new Map());
    const draftWatchedKeys = useRef<Set<string>>(new Set());

    const lastResult = useRef<{ value?: T } | null>(null);
    const subscriberRef = useRef<Subscriber<T, TFieldValues> | null>(null);

    const lastSnapshotState = useRef<Partial<FormState<TFieldValues>> & { values: TFieldValues }>({
        ...control._formState,
        values: control._formValues as TFieldValues,
    });

    const lastManagerState = useRef<Partial<FormState<TFieldValues>> & { values: TFieldValues }>({
        ...control._formState,
        values: control._formValues as TFieldValues,
    });

    const getSnapshot = useCallback((): T | undefined => {
        const rawState = patchFormState({
            ...control._formState,
            values: control._formValues,
            defaultValues: control._defaultValues
        } as Partial<FormState<TFieldValues>> & { values: TFieldValues })

        if (!subscriberRef.current) {
            const newValue = selectWithProxy(stableSelector, rawState, draftWatchedKeys, draftWatchedMeta)

            lastSnapshotState.current = safeClone(rawState)

            if (stableEqualityFn(newValue, lastResult.current?.value)) {
                return lastResult.current?.value
            }

            lastResult.current = { value: newValue };

            return newValue
        }

        const shouldNotify = hasWatchedKeysChanged(
            watchedKeys,
            watchedMeta,
            rawState,
            lastSnapshotState,
        )

        if (!shouldNotify) {
            return lastResult.current?.value;
        }

        const newValue = selectWithProxy(stableSelector, rawState, watchedKeys, watchedMeta)

        lastSnapshotState.current = safeClone(rawState);

        if (stableEqualityFn(newValue, lastResult.current?.value)) {
            return lastResult.current?.value;
        }

        lastResult.current = { value: newValue };

        return newValue;
    }, [control, stableEqualityFn, stableSelector])

    const subscribe = useCallback((onStoreChange: () => void) => {
        if (!subscriberRef.current) {
            const initialState = patchFormState({
                ...safeClone(control._formState),
                values: safeClone(control._formValues),
                defaultValues: safeClone(control._defaultValues),
            } as Partial<FormState<TFieldValues>> & { values: TFieldValues })

            const initialValue = selectWithProxy(stableSelector, initialState, watchedKeys, watchedMeta);

            lastManagerState.current = initialState

            subscriberRef.current = {
                callback: onStoreChange,
                selector: stableSelector,
                equalityFn: stableEqualityFn,
                watchedKeys,
                watchedMeta,
                lastValue: initialValue,
                lastFormState: lastManagerState,
                type: 'value',
                selectorSource: 'user'
            };

            registerSubscriber(control, subscriberRef)
        } else {
            subscriberRef.current.callback = onStoreChange;
        }

        const manager = getManager(control)
        addSubscriberCallback(manager, subscriberRef)

        return () => removeSubscriber(control, manager, subscriberRef)
    }, [control, stableEqualityFn, stableSelector])

    return useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot
    );
}
