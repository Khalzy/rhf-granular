import { RefObject } from "react";
import type { FieldValues, FormState } from "react-hook-form";

export type EqualityFn<T> = (a?: T, b?: T | null) => boolean;

export type SubscriberCallback<TFieldValues extends FieldValues = FieldValues> = ((state?: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => void)

export interface Subscriber<T = unknown, TFieldValues extends FieldValues = FieldValues> {
    callback: SubscriberCallback<TFieldValues>
    selector?: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T
    equalityFn?: EqualityFn<T>
    watchedKeys: RefObject<Set<string>>;
    lastValue?: T | null;
    lastFormState: Partial<FormState<TFieldValues>>
    type: 'effect' | 'value'
}

export interface SubscriptionManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribers: Map<() => void, Subscriber<any, any>>
    unsubscribe: () => void;
    prev?: FieldValues
}
