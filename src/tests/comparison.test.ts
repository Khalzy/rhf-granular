import { renderHook, act } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { useFormSelector } from '../useFormSelector';

describe('useFormSelector vs watch - Re-render Comparison', () => {
    describe('Derived boolean from field value', () => {
        it('watch: re-renders on every field change', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5 }
            }));

            let renderCount = 0;
            const { result: isEnterpriseResult } = renderHook(() => {
                renderCount++;
                const plan = useWatch({ control: formResult.current.control, name: 'plan' });
                return plan === 'enterprise';
            });

            const initialRenderCount = renderCount;
            expect(isEnterpriseResult.current).toBe(false);

            // Change plan from 'starter' to 'pro' - boolean stays false
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(isEnterpriseResult.current).toBe(false); // Still false
            expect(renderCount).toBe(initialRenderCount + 1); // But re-rendered!
        });

        it('useFormSelector: only re-renders when boolean changes', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5 }
            }));

            let renderCount = 0;
            const { result: isEnterpriseResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.plan === 'enterprise'
                );
            });

            const initialRenderCount = renderCount;
            expect(isEnterpriseResult.current).toBe(false);

            // Change plan from 'starter' to 'pro' - boolean stays false
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(isEnterpriseResult.current).toBe(false); // Still false
            expect(renderCount).toBe(initialRenderCount); // NO re-render!
        });
    });

    describe('Computed value from multiple fields', () => {
        it('watch: re-renders when ANY watched field changes', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5, region: 'US' }
            }));

            let renderCount = 0;
            const { result: priceResult } = renderHook(() => {
                renderCount++;
                const plan = useWatch({ control: formResult.current.control, name: 'plan' });
                const seats = useWatch({ control: formResult.current.control, name: 'seats' });
                const base = plan === 'enterprise' ? 99 : 29;
                return base * seats;
            });

            const initialRenderCount = renderCount;
            expect(priceResult.current).toBe(145); // 29 * 5

            // Change unrelated field
            act(() => {
                formResult.current.setValue('region', 'EU');
            });

            expect(priceResult.current).toBe(145); // Price unchanged
            expect(renderCount).toBe(initialRenderCount); // watch doesn't watch region, so no re-render

            // Change plan from 'starter' to 'pro' (both use 29 base price)
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(priceResult.current).toBe(145); // Price still 145
            expect(renderCount).toBe(initialRenderCount + 1); // But re-rendered!
        });

        it('useFormSelector: only re-renders when computed value changes', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5, region: 'US' }
            }));

            let renderCount = 0;
            const { result: priceResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(formResult.current.control, s => {
                    const base = s.values.plan === 'enterprise' ? 99 : 29;
                    return base * s.values.seats;
                });
            });

            const initialRenderCount = renderCount;
            expect(priceResult.current).toBe(145); // 29 * 5

            // Change unrelated field
            act(() => {
                formResult.current.setValue('region', 'EU');
            });

            expect(priceResult.current).toBe(145);
            expect(renderCount).toBe(initialRenderCount); // No re-render

            // Change plan from 'starter' to 'pro' (both use 29 base price)
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(priceResult.current).toBe(145); // Price unchanged
            expect(renderCount).toBe(initialRenderCount); // NO re-render!
        });
    });

    describe('Mixing watch and useFormSelector in same component', () => {
        it('useWatch causes re-render even when useFormSelector result unchanged', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5, showAdvanced: false }
            }));

            let renderCount = 0;
            const { result: mixedResult } = renderHook(() => {
                renderCount++;

                // Using watch for one field
                const showAdvanced = useWatch({
                    control: formResult.current.control,
                    name: 'showAdvanced'
                });

                // Using useFormSelector for derived value
                const isEnterprise = useFormSelector(
                    formResult.current.control,
                    s => s.values.plan === 'enterprise'
                );

                return { showAdvanced, isEnterprise };
            });

            const initialRenderCount = renderCount;

            // Change plan - isEnterprise stays false
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            // watch doesn't watch 'plan', so should not re-render from watch
            // useFormSelector also doesn't re-render (output didn't change)
            expect(renderCount).toBe(initialRenderCount); // Both cooperate!

            // Change showAdvanced - this is watched by watch
            act(() => {
                formResult.current.setValue('showAdvanced', true);
            });

            // watch triggers re-render, pulling useFormSelector along
            expect(renderCount).toBe(initialRenderCount + 1);
            expect(mixedResult.current.isEnterprise).toBe(false)
            expect(mixedResult.current.showAdvanced).toBe(true)
        });

        it('all useFormSelector - component only re-renders when needed', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { plan: 'starter', seats: 5, showAdvanced: false }
            }));

            let renderCount = 0;
            const { result: cleanResult } = renderHook(() => {
                renderCount++;

                const showAdvanced = useFormSelector(
                    formResult.current.control,
                    s => s.values.showAdvanced
                );

                const isEnterprise = useFormSelector(
                    formResult.current.control,
                    s => s.values.plan === 'enterprise'
                );

                return { showAdvanced, isEnterprise };
            });

            const initialRenderCount = renderCount;

            // Change plan from 'starter' to 'pro' - isEnterprise stays false
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(cleanResult.current.isEnterprise).toBe(false);
            expect(renderCount).toBe(initialRenderCount); // No re-render!

            // Change showAdvanced
            act(() => {
                formResult.current.setValue('showAdvanced', true);
            });

            expect(cleanResult.current.showAdvanced).toBe(true);
            expect(renderCount).toBe(initialRenderCount + 1); // One re-render
        });
    });

    describe('Array operations', () => {
        it('watch: re-renders even when array item value stays same', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    items: [
                        { id: 1, status: 'active' },
                        { id: 2, status: 'inactive' }
                    ]
                }
            }));

            let renderCount = 0;
            const { result: hasActiveResult } = renderHook(() => {
                renderCount++;
                const items = useWatch({ control: formResult.current.control, name: 'items' });
                return items.some(item => item.status === 'active');
            });

            const initialRenderCount = renderCount;
            expect(hasActiveResult.current).toBe(true);

            // Change inactive item's id - hasActive stays true
            act(() => {
                formResult.current.setValue('items.1.id', 99);
            });

            expect(hasActiveResult.current).toBe(true); // Still true
            expect(renderCount).toBe(initialRenderCount + 1); // But re-rendered!
        });

        it('useFormSelector: no re-render when derived boolean stays same', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    items: [
                        { id: 1, status: 'active' },
                        { id: 2, status: 'inactive' }
                    ]
                }
            }));

            let renderCount = 0;
            const { result: hasActiveResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.items.some(item => item.status === 'active')
                );
            });

            const initialRenderCount = renderCount;
            expect(hasActiveResult.current).toBe(true);

            // Change inactive item's id - hasActive stays true
            act(() => {
                formResult.current.setValue('items.1.id', 99);
            });

            expect(hasActiveResult.current).toBe(true); // Still true
            expect(renderCount).toBe(initialRenderCount); // No re-render
        });
    });

    describe('Performance with rapid updates', () => {
        it('watch: re-renders on every update', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { counter: 0 }
            }));

            let renderCount = 0;
            renderHook(() => {
                renderCount++;
                useWatch({ control: formResult.current.control, name: 'counter' });
            });

            const initialRenderCount = renderCount;

            // Rapid updates
            act(() => {
                for (let i = 1; i <= 10; i++) {
                    formResult.current.setValue('counter', i);
                }
            });

            // watch triggers re-render on each setValue (with React batching)
            expect(renderCount).toBeGreaterThan(initialRenderCount);
        });

        it('useFormSelector: can skip re-renders for derived values', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { counter: 0 }
            }));

            let renderCount = 0;
            const { result: isEvenResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.counter % 2 === 0
                );
            });

            const initialRenderCount = renderCount;
            expect(isEvenResult.current).toBe(true); // 0 is even

            // Update counter: 0 → 2 → 4 → 6 → 8 → 10 (all even)
            act(() => {
                for (let i = 1; i <= 5; i++) {
                    formResult.current.setValue('counter', i * 2);
                }
            });

            expect(isEvenResult.current).toBe(true); // Still even
            // Selector ran 5 times but output was always true, so no re-renders
            expect(renderCount).toBe(initialRenderCount);
        });
    });
});

