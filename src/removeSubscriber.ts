import { Control, FieldValues } from "react-hook-form"
import { Subscriber, SubscriptionManager } from "./types/manager"
import { managers } from "./manager"
import { RefObject } from "react"

export function removeSubscriber<T, TFieldValues extends FieldValues = FieldValues>(
    control: Control<TFieldValues>,
    manager: SubscriptionManager<T, TFieldValues>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriber: RefObject<Subscriber<any, TFieldValues> | null>
) {
    if (!subscriber.current) return

    manager.subscribers.delete(subscriber.current.callback)

    if (manager.subscribers.size === 0) {
        manager.unsubscribe()
        managers.delete(control)
    }
}