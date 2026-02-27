import type { Control } from "react-hook-form";
import type { SubscriptionManager } from "./types/manager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const managers = new WeakMap<Control<any>, SubscriptionManager<any>>();
