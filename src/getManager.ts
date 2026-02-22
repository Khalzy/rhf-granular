import { type Control, type FieldValues, type FormState } from 'react-hook-form';
import { managers } from './manager';
import type { Subscriber, SubscriptionManager } from './types/manager';
import { shallow } from './utils/shallow';

export function getManager<TFieldValues extends FieldValues = FieldValues>(control: Control<TFieldValues>): SubscriptionManager {
    if (!managers.has(control)) {
        const subscribers = new Map<() => void, Subscriber<unknown>>();

        // Baseline state to diff against in the subscriber callback
        let prev = { ...control._formState, values: control._formValues } as FormState<FieldValues> & { values: FieldValues };

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
                const changedKeys = new Set<string>();
                (Object.keys(formState) as Array<keyof FormState<FieldValues>>).forEach((key) => {
                    if (formState[key] !== prev[key]) {
                        changedKeys.add(key);
                    }
                });

                subscribers.forEach((sub) => {
                    const shouldNotify = Array.from(sub.watchedKeys.current).some((key) =>
                        changedKeys.has(key)
                    );

                    if (shouldNotify) {
                        if (sub.type === 'effect') {
                            sub.callback(formState);
                        } else if (!Object.is(formState, sub.lastFormState)) {
                            const newValue = sub.selector?.(formState);
                            const equalityFn = sub?.equalityFn ?? shallow;

                            if (!equalityFn(newValue, sub.lastValue)) {
                                sub.lastValue = newValue;
                                sub.lastFormState = formState;
                                sub.callback?.(formState);
                            }
                        }
                    }
                });

                prev = formState as FormState<FieldValues> & { values: FieldValues };
            },
        });

        managers.set(control, { subscribers, unsubscribe, prev });
    }

    return managers.get(control)!;
}
