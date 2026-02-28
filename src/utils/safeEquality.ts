import { EqualityFn } from "../types/manager"
import { shallow } from "./shallow"

export const safeEquality = <T>(
    a: T | undefined | null,
    b: T | undefined | null,
    equalityFn: EqualityFn<T> = shallow
): boolean => {
    if (a == null || b == null) return false
    return equalityFn(a, b)
}