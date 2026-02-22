import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { useFormSelector } from '../useFormSelector';
import { managers } from '../manager';

describe('Manager cleanup', () => {
    it('removes subscriber on unmount', () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { name: '' }
        }))

        const { unmount } = renderHook(() =>
            useFormSelector(formResult.current.control, s => s.values.name)
        )

        // verify subscriber exists
        expect(managers.get(formResult.current.control)?.subscribers.size).toBe(1)

        unmount()

        // manager entry removed entirely on last subscriber unmount and removes form control
        expect(managers.get(formResult.current.control)?.subscribers.size).toBeUndefined()
        expect(managers.has(formResult.current.control)).toBe(false)
    })
});