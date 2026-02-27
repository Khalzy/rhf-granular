import { type Control, type FieldValues } from 'react-hook-form';
import { createFormSubscription } from './createFormSubscription';
import { managers } from './manager';
import type { SubscriptionManager } from './types/manager';

export function getOrCreateSubscriptionManager<TFieldValues extends FieldValues = FieldValues>(control: Control<TFieldValues>): SubscriptionManager {
    if (!managers.has(control)) {
        const subscription = createFormSubscription(control)
        managers.set(control, subscription);

        return managers.get(control)!;
    }

    return managers.get(control)!;
}
