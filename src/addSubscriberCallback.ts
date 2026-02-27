import { FieldValues } from "react-hook-form";
import { Subscriber, SubscriptionManager } from "./types/manager";
import { RefObject } from "react";

export function addSubscriberCallback<T, TFieldValues extends FieldValues>(
    manager: SubscriptionManager,
    subscriberRef: RefObject<Subscriber<T, TFieldValues>>
) {
    manager.subscribers.set(subscriberRef.current.callback, subscriberRef)
}