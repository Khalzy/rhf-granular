import { useCallback, useEffect, useRef } from "react";
import { type Control, type FieldValues, type FormState } from "react-hook-form";
import { registerSubscriber } from "./registerSubscriber";
import { selectWithProxy } from "./selectWIthProxy";
import { EqualityFn, Subscriber } from "./types/manager";
import { PathMeta } from "./types/pathMeta";
import { shallow } from "./utils/shallow";
import { getManager } from "./getManager";
import { removeSubscriber } from "./removeSubscriber";
import { useStableRef } from "./hooks/useStableRef";
/**
 * Execute side effects in response to form state changes without causing re-renders.
 * 
 * The callback receives the current form state and runs whenever subscribed keys change.
 * This hook does NOT cause component re-renders - use it for analytics, external state sync,
 * or other side effects.
 * 
 * @example
 * useFormEffect(control, ({ values, isDirty }) => {
 *   if (values.plan === "enterprise" && isDirty) {
 *     trackEvent("enterprise_plan_edited");
 *   }
 * });
 * 
 * @example
 * useFormEffect(control, ({ values }) => {
 *   if (values.seats > 100) {
 *     showVolumeDiscountBanner();
 *   } else {
 *     hideVolumeDiscountBanner();
 *   }
 * });
 */
export function useFormEffect<T, TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>,
    callback: (state?: Partial<FormState<TFieldValues>> & {
        values: TFieldValues;
    }) => void,
    options: {
        selector?: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T,
        equalityFn?: EqualityFn<T>
    } = {}
): void {
    const callbackRef = useStableRef(callback);

    const subscriberRef = useRef<Subscriber<T, TFieldValues> | null>(null);

    const stableSelectorRef = useRef(options?.selector);
    stableSelectorRef.current = options?.selector;

    const stableEqualityFnRef = useRef(options?.equalityFn ?? shallow);
    stableEqualityFnRef.current = options?.equalityFn ?? shallow;

    const lastEffectState = useRef<Partial<FormState<TFieldValues>> & { values: TFieldValues }>({
        ...control._formState,
        values: control._formValues as TFieldValues,
    });

    const watchedKeys = useRef<Set<string>>(new Set());
    const watchedMeta = useRef<Map<string, PathMeta>>(new Map());

    const stableEffect = useCallback((
        state?: Partial<FormState<TFieldValues>> & { values: TFieldValues }
    ) => {
        callbackRef.current(state)
        return null
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const stableSelector = useCallback((
        state: Partial<FormState<TFieldValues>> & { values: TFieldValues }
    ) => stableSelectorRef?.current?.(state), [])


    const equalityFn = useCallback((
        a?: T, b?: T | null
    ): boolean => stableEqualityFnRef.current(a, b) ?? true, [])

    useEffect(() => {
        if (!subscriberRef.current) {
            const initialState = {
                ...structuredClone(control._formState),
                values: structuredClone(control._formValues) as unknown as TFieldValues,
                defaultValues: structuredClone(control._defaultValues) as unknown as TFieldValues
            } as Partial<FormState<TFieldValues>> & { values: TFieldValues };

            const stableSelectorOrEffect = options.selector ? stableSelector : stableEffect

            const initialValue = selectWithProxy(stableSelectorOrEffect, initialState, watchedKeys, watchedMeta);

            lastEffectState.current = initialState

            subscriberRef.current = {
                callback: stableEffect,
                selector: stableSelector,
                equalityFn: equalityFn,
                watchedKeys,
                watchedMeta,
                lastValue: initialValue,
                lastFormState: lastEffectState,
                type: 'effect',
                selectorSource: options.selector ? 'user' : 'default'
            };

            registerSubscriber(control, subscriberRef)
        } else {
            subscriberRef.current.callback = stableEffect;
        }

        const manager = getManager(control)
        return () => removeSubscriber(control, manager, subscriberRef)
    }, [control, equalityFn, options.selector, stableEffect, stableSelector]);
}
