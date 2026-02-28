import { FieldValues, FormState } from "react-hook-form";

export const patchFormState = <TFieldValues extends FieldValues>(
    state: Partial<FormState<TFieldValues>> & { values: TFieldValues }
): Partial<FormState<TFieldValues>> & { values: TFieldValues } => ({
    ...state,
    isDirty: Object.keys(state.dirtyFields ?? {}).length > 0,
    isValid: Object.keys(state.errors ?? {}).length === 0,
    isValidating: Object.keys(state.validatingFields ?? {}).length > 0,
})