import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { managers } from '../manager';
import { useFormSelector } from '../useFormSelector';
import { act } from 'react';
import { getManager } from '../getManager';

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

    it('two form instances never share manager state', () => {
        const { result: form1 } = renderHook(() => useForm({ defaultValues: { name: '' } }))
        const { result: form2 } = renderHook(() => useForm({ defaultValues: { name: '' } }))

        renderHook(() => useFormSelector(form1.current.control, s => s.values.name))
        renderHook(() => useFormSelector(form2.current.control, s => s.values.name))

        expect(managers.get(form1.current.control)).not.toBe(
            managers.get(form2.current.control)
        )
    })
});

describe('manager lifecycle', () => {
    it('re-creates manager and resubscribes after cleanup', async () => {
        const { result: formResult } = renderHook(() =>
            useForm({ defaultValues: { name: '' } })
        )

        const { unmount } = renderHook(() =>
            useFormSelector(formResult.current.control, (s) => s.values.name)
        )

        unmount()

        const { result } = renderHook(() =>
            useFormSelector(formResult.current.control, (s) => s.values.name)
        )

        await act(async () => {
            formResult.current.setValue('name', 'Ghada')
        })

        expect(result.current).toBe('Ghada')
        expect(formResult.current.getValues('name')).toBe('Ghada')
    })

    it('does not duplicate subscribers on remount', async () => {
        const { result: formResult } = renderHook(() =>
            useForm({ defaultValues: { name: '' } })
        )

        const { unmount } = renderHook(() =>
            useFormSelector(formResult.current.control, (s) => s.values.name)
        )

        unmount()

        renderHook(() =>
            useFormSelector(formResult.current.control, (s) => s.values.name)
        )

        // only 1 subscriber should exist, not 2
        const manager = getManager(formResult.current.control)
        expect(manager.subscribers.size).toBe(1)
    })
})