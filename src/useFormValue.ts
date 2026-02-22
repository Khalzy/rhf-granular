import { type FieldValues, type FieldPath, type Control, get } from "react-hook-form";
import { useFormSelector } from "./useFormSelector";

/**
 * This is a convenience wrapper around useFormSelector that uses RHF's
 * internal get utility for dot-notation path resolution.
 */
export function useFormValue<
    TFieldValues extends FieldValues = FieldValues,
    TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>,
    name: TFieldName
): FieldValues {
    return useFormSelector(control, ({ values }) => get(values, name));
}