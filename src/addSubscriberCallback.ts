import { FieldValues } from "react-hook-form";
import { Subscriber, SubscriptionManager } from "./types/manager";
import { RefObject } from "react";

export function addSubscriberCallback<T, TFieldValues extends FieldValues = FieldValues>(
    manager: SubscriptionManager<T, TFieldValues>,
    subscriberRef: RefObject<Subscriber<T, TFieldValues> | null>
) {
    if (!subscriberRef.current) return

    manager.subscribers.set(subscriberRef.current.callback, subscriberRef)
}