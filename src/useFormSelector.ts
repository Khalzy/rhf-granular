import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Control, FieldValues, FormState } from "react-hook-form";
import { subscribeManager } from "./subscribe";
import type { EqualityFn, Subscriber } from "./types/manager";
import { shallow } from "./utils/shallow";

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
export function useFormSelector<TFieldValues extends FieldValues = FieldValues, T = unknown>(
    control: Control<TFieldValues>,
    selector: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T,
    options: {
        equalityFn: EqualityFn<T>
    } = { equalityFn: shallow }
): T {
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    const equalityRef = useRef(options.equalityFn);
    equalityRef.current = options.equalityFn;

    const watchedKeys = useRef<Set<string>>(new Set());

    const lastResult = useRef<{ state: Partial<FormState<TFieldValues>>; value: T } | null>(null);

    const subscriberRef = useRef<Subscriber<T, TFieldValues> | null>(null);

    const stableSelector = useCallback((state: Partial<FormState<TFieldValues>> & { values: TFieldValues }): T => selectorRef.current(state), [])

    const stableEqualityFn: EqualityFn<T> = useCallback((a, b) => equalityRef.current(a, b), [])

    const getSnapshot = useCallback((): T => {
        const currentState = { ...control._formState, values: control._formValues as TFieldValues };

        if (lastResult.current && Object.is(lastResult.current.state, control._formState)) {
            return lastResult.current.value;
        }

        const newValue = selectorRef.current(currentState);

        if (lastResult.current && equalityRef.current(newValue, lastResult.current.value)) {
            return lastResult.current.value;
        }

        lastResult.current = { state: control._formState, value: newValue };
        return newValue;
    }, [control])

    return useSyncExternalStore(
        (onStoreChange) => {
            const currentState = { ...control._formState, values: control._formValues as TFieldValues };

            if (!subscriberRef.current) {
                subscriberRef.current = {
                    callback: onStoreChange,
                    selector: stableSelector,
                    equalityFn: stableEqualityFn,
                    watchedKeys,
                    lastValue: stableSelector(currentState),
                    lastFormState: control._formState,
                    type: 'value',
                };
            } else {
                subscriberRef.current.callback = onStoreChange;
            }

            const unsubscribe = subscribeManager(control, subscriberRef.current)

            return () => {
                unsubscribe()
            }
        },
        getSnapshot,
        getSnapshot
    );
}
