import { addSubscriberCallback } from "./addSubscriberCallback";
import { EqualityFn, Subscriber } from "./types/manager";
import { getManager } from "./getManager";
import { patchFormState } from "./utils/patchFormState";
import { PathMeta } from "./types/pathMeta";
import { registerSubscriber } from "./registerSubscriber";
import { removeSubscriber } from "./removeSubscriber";
import { safeClone } from "./utils/safeClone";
import { safeEquality } from "./utils/safeEquality";
import { selectWithProxy } from "./selectWIthProxy";
import { type Control, type FieldValues, type FormState } from "react-hook-form";
import { useEffect, useRef } from "react";
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
    const stableEffect = useStableRef<[
        Partial<FormState<TFieldValues>> & { values: TFieldValues }
    ], undefined>((args) => {
        void callback(args)
        return undefined
    });

    const stableSelector = useStableRef<[
        Partial<FormState<TFieldValues>> & { values: TFieldValues }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ], any>((args) => {
        if (options.selector) options.selector(args)
        return args
    });
    const stableEqualityFn = useStableRef<[T | undefined | null, T | undefined | null], boolean>(
        (a, b) => safeEquality(a, b, options?.equalityFn)
    );

    const subscriberRef = useRef<Subscriber<T, TFieldValues> | null>(null);

    const lastEffectState = useRef<Partial<FormState<TFieldValues>> & { values: TFieldValues }>({
        ...control._formState,
        values: control._formValues as TFieldValues,
    });

    const watchedKeys = useRef<Set<string>>(new Set());
    const watchedMeta = useRef<Map<string, PathMeta>>(new Map());

    useEffect(() => {
        if (!subscriberRef.current) {
            const initialState = patchFormState({
                ...safeClone(control._formState),
                values: safeClone(control._formValues),
                defaultValues: safeClone(control._defaultValues),
            } as Partial<FormState<TFieldValues>> & { values: TFieldValues })

            const stableSelectorOrEffect = options.selector ? stableSelector : stableEffect

            const initialValue = selectWithProxy(stableSelectorOrEffect, initialState, watchedKeys, watchedMeta);

            lastEffectState.current = initialState

            subscriberRef.current = {
                callback: stableEffect,
                selector: stableSelector,
                equalityFn: stableEqualityFn,
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
        addSubscriberCallback(manager, subscriberRef)

        return () => removeSubscriber(control, manager, subscriberRef)
    }, [control, options.selector, stableEffect, stableEqualityFn, stableSelector]);
}
