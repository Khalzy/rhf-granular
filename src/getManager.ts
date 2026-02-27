import { Control, FieldValues } from "react-hook-form"
import { managers } from "./manager";
import { createFormSubscription } from "./createFormSubscription";
import { SubscriptionManager } from "./types/manager";

export function getManager<TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>
): SubscriptionManager {
    if (!managers.has(control)) {
        const subscription = createFormSubscription(control)
        managers.set(control, subscription);

        return managers.get(control)!;
    }

    return managers.get(control)!
}