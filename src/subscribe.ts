import { FormState, FieldValues, Control } from "react-hook-form";
import { getManager } from "./getManager";
import { managers } from "./manager";
import { Subscriber } from "./types/manager";

export const subscribeManager = <T = unknown, TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>,
    subscriber: Subscriber<T, TFieldValues>,
) => {
    const manager = getManager(control);

    if (subscriber.watchedKeys.current.size === 0) {
        const currentState = { ...control._formState, values: control._formValues };
        const proxy = new Proxy(currentState, {
            get(target: Record<string, unknown>, prop: string) {
                subscriber.watchedKeys.current.add(prop);
                return target[prop];
            },
        });

        const callback = subscriber.type === 'value' ? subscriber.selector : subscriber.callback

        try {
            callback?.(proxy as Partial<FormState<TFieldValues>> & { values: TFieldValues });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error: unknown) {
            // Selector might error on proxy access (e.g., Object.keys, JSON.stringify)
            // Fallback to subscribing to common keyss
            subscriber.watchedKeys.current = new Set(['values', 'errors', 'isDirty', 'isValid', 'touchedFields']);
        }
    }

    manager.subscribers.set(subscriber.callback, subscriber);

    return () => {
        manager.subscribers.delete(subscriber.callback);

        if (manager.subscribers.size === 0) {
            manager.unsubscribe();
            managers.delete(control);
        }
    };
}