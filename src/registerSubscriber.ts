import { Control, FieldValues } from "react-hook-form";
import { addSubscriberCallback } from "./addSubscriberCallback";
import { getOrCreateSubscriptionManager } from "./getOrCreateSubscriptionManager";
import { removeSubscriber } from "./removeSubscriber";
import { Subscriber } from "./types/manager";
import { RefObject } from "react";

export const registerSubscriber = <T, TFieldValues extends FieldValues>(
    control: Control<TFieldValues>,
    subscriber: RefObject<Subscriber<T, TFieldValues> | null>,
) => {
    const manager = getOrCreateSubscriptionManager(control)
    addSubscriberCallback(manager, subscriber)

    return () => removeSubscriber(control, manager, subscriber)
}