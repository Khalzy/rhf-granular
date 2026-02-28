import { Control, FieldValues } from "react-hook-form";
import { selectWithProxy } from "./selectWIthProxy";
import { Subscriber } from "./types/manager";
import { hasWatchedKeysChanged } from "./utils/hasWatchedKeysChanged";
import { shallow } from "./utils/shallow";
import { RefObject } from "react";
import { patchFormState } from "./utils/patchFormState";
import { safeEquality } from "./utils/safeEquality";

export function createFormSubscription<T, TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>
) {
    const subscribers = new Map<() => void, RefObject<Subscriber<T, TFieldValues>>>();

    const unsubscribe = control._subscribe({
        formState: {
            values: true,
            errors: true,
            touchedFields: true,
            dirtyFields: true,
            isDirty: true,
            isValid: true,
            isValidating: true,
            validatingFields: true,
        },
        callback: (formState) => {
            const patchedFormState = patchFormState(formState)

            subscribers.forEach((subscriber) => {
                const sub = subscriber.current

                const shouldNotify = hasWatchedKeysChanged(
                    sub.watchedKeys,
                    sub.watchedMeta,
                    patchedFormState,
                    sub.lastFormState
                )

                if (shouldNotify) {
                    const newValue = selectWithProxy(sub.selector, patchedFormState, sub.watchedKeys, sub.watchedMeta)

                    sub.lastFormState.current = patchedFormState;

                    if (sub.type === 'effect' && sub.selectorSource === 'default') {
                        sub.callback?.(patchedFormState)
                    }

                    if (sub.selectorSource === 'user' && !safeEquality(newValue, sub.lastValue, sub?.equalityFn ?? shallow)) {
                        sub.lastValue = newValue;

                        if (sub.type === 'effect') sub.callback?.(patchedFormState)
                        if (sub.type === 'value') sub.callback?.(patchedFormState)
                    }
                }

            });
        },
    });

    return { subscribers, unsubscribe }
}
