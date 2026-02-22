import { useCallback, useEffect, useRef } from "react";
import type { Control, FieldValues, FormState } from "react-hook-form";
import { subscribeManager } from "./subscribe";
import { Subscriber } from "./types/manager";
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
export function useFormEffect(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>,
    callback: (state?: Partial<FormState<FieldValues>> & { values: FieldValues }) => void,
): void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const watchedKeys = useRef<Set<string>>(new Set());

    const stableEffectCallback = useCallback((state?: Partial<FormState<FieldValues>> & { values: FieldValues }) => callbackRef.current(state), [])

    useEffect(() => {
        const currentState = { ...control._formState, values: control._formValues };

        const subscriber: Subscriber<unknown> = {
            callback: stableEffectCallback,
            watchedKeys,
            lastValue: null,
            lastFormState: currentState,
            type: 'effect',
        };

        const unsubscribe = subscribeManager(control, subscriber)

        return unsubscribe
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [control]);
}
