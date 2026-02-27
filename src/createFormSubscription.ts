import { Control, FieldValues } from "react-hook-form";
import { selectWithProxy } from "./selectWIthProxy";
import { Subscriber } from "./types/manager";
import { hasWatchedKeysChanged } from "./utils/hasWatchedKeysChanged";
import { shallow } from "./utils/shallow";
import { RefObject } from "react";

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
            subscribers.forEach((subscriber) => {
                const sub = subscriber.current

                const shouldNotify = hasWatchedKeysChanged(
                    sub.watchedKeys,
                    sub.watchedMeta,
                    formState,
                    sub.lastFormState
                )

                if (shouldNotify) {
                    const newValue = selectWithProxy(sub.selector, formState, sub.watchedKeys, sub.watchedMeta)
                    const equalityFn = sub?.equalityFn ?? shallow;

                    sub.lastFormState.current = formState;

                    if (sub.type === 'effect' && sub.selectorSource === 'default') {
                        sub.callback?.(formState)
                    }

                    if (sub.selectorSource === 'user' && !equalityFn(newValue, sub.lastValue)) {
                        sub.lastValue = newValue;

                        if (sub.type === 'effect') sub.callback?.(formState)
                        if (sub.type === 'value') sub.callback?.()
                    }
                }

            });
        },
    });

    return { subscribers, unsubscribe }
}
