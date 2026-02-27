import { RefObject } from "react";
import { Control, FieldValues } from "react-hook-form";
import { addSubscriberCallback } from "./addSubscriberCallback";
import { getManager } from "./getManager";
import { removeSubscriber } from "./removeSubscriber";
import { Subscriber } from "./types/manager";

export const registerSubscriber = <T, TFieldValues extends FieldValues>(
    control: Control<TFieldValues>,
    subscriber: RefObject<Subscriber<T, TFieldValues> | null>,
) => {
    const manager = getManager(control)
    addSubscriberCallback(manager, subscriber)

    return () => removeSubscriber(control, manager, subscriber)
}