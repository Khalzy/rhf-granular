import { type FieldValues, type FieldPath, type Control, get, FieldPathValue } from "react-hook-form";
import { useFormSelector } from "./useFormSelector";

/**
 * This is a convenience wrapper around useFormSelector that uses RHF's
 * internal get utility for dot-notation path resolution.
 */
export function useFormValue<
    TFieldValues extends FieldValues,
    TFieldName extends FieldPath<TFieldValues>
>(
    control: Control<TFieldValues>,
    name: TFieldName
): FieldPathValue<TFieldValues, TFieldName> {
    return useFormSelector(control, (state) => get(state.values, name));
}
