import { RefObject } from "react";
import type { FieldValues, FormState } from "react-hook-form";
import { PathMeta } from "./pathMeta";

export type EqualityFn<T> = (a?: T, b?: T | null) => boolean;

export type SubscriberCallback<TFieldValues extends FieldValues = FieldValues> = ((state?: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => void)

export interface Subscriber<T, TFieldValues extends FieldValues = FieldValues> {
    callback: SubscriberCallback<TFieldValues>
    selector: (state: Partial<FormState<TFieldValues>> & { values: TFieldValues }) => T | undefined
    equalityFn?: EqualityFn<T>
    watchedKeys: RefObject<Set<string>>;
    watchedMeta: RefObject<Map<string, PathMeta>>;
    lastValue?: T | null;
    lastFormState: RefObject<Partial<FormState<TFieldValues>> & { values: TFieldValues }>
    type: 'effect' | 'value';
    selectorSource: 'user' | 'default'
}

export interface SubscriptionManager<TFieldValues extends FieldValues = FieldValues> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribers: Map<() => void, RefObject<Subscriber<any, TFieldValues> | null>>
    unsubscribe: () => void;
    prev?: FieldValues
}
