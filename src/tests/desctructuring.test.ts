import { renderHook, act } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { useFormSelector } from '../useFormSelector';
import { useFormValue } from '../useFormValue';

describe('Destructuring Support', () => {
    it('useFormSelector: works with destructuring in selector', () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { plan: 'starter', seats: 5 }
        }));

        let renderCount = 0;
        const { result: priceResult } = renderHook(() => {
            renderCount++;

            return useFormSelector(formResult.current.control, ({ values }) => {
                const base = values.plan === 'enterprise' ? 99 : 29;
                return base * values.seats;
            });
        });

        expect(priceResult.current).toBe(145); // 29 * 5
        const initialRenderCount = renderCount;

        // Change plan and the price changes (enterprise is 99)
        act(() => {
            formResult.current.setValue('plan', 'enterprise');
        });

        const secondRenderCount = initialRenderCount + 1
        expect(priceResult.current).toBe(495);
        expect(renderCount).toBe(initialRenderCount + 1);

        // Change the seats and the price changes (enterprise is 99 * 6)
        act(() => {
            formResult.current.setValue('seats', 6)
        })

        expect(priceResult.current).toBe(594);
        expect(renderCount).toBe(secondRenderCount + 1)
    });

    it('useFormSelector: works with nested destructuring', () => {
        // Note: proxy tracks 'values' at top level
        // nested access works because the whole values object
        // re-evaluates when 'values' key is marked as watched
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: {
                user: { name: 'John', email: 'john@example.com' },
                settings: { theme: 'dark' }
            }
        }));

        const { result: userNameResult } = renderHook(() =>
            useFormSelector(formResult.current.control, ({ values: { user } }) => user.name)
        );

        expect(userNameResult.current).toBe('John');

        act(() => {
            formResult.current.setValue('user.name', 'Jane');
        });

        expect(userNameResult.current).toBe('Jane');
    });

    it("useFormSelector: no re-render when formState fields haven't changed", () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { email: '' }
        }));

        let renderCount = 0;
        const { result: canSubmitResult } = renderHook(() => {
            renderCount++;

            return useFormSelector(
                formResult.current.control,
                ({ isDirty, isValid, isSubmitting }) => isDirty && isValid && !isSubmitting
            );
        });

        expect(canSubmitResult.current).toBe(false);
        const initialRenderCount = renderCount;

        // Make dirty but still invalid
        act(() => {
            formResult.current.setValue('email', 'invalid');
        });

        expect(canSubmitResult.current).toBe(false);
        expect(renderCount).toBe(initialRenderCount);
    });
});

describe('useFormValue vs watch - When to Use What', () => {
    describe('Scenario: Display current field value', () => {
        it('useFormValue: clean for single field display', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { accountType: 'personal' }
            }));

            let renderCount = 0;
            const { result: accountTypeResult } = renderHook(() => {
                renderCount++;
                return useFormValue(formResult.current.control, 'accountType');
            });

            expect(accountTypeResult.current).toBe('personal');

            act(() => {
                formResult.current.setValue('accountType', 'business');
            });

            expect(accountTypeResult.current).toBe('business');
            expect(renderCount).toBe(2); // Initial + one update
        });

        it('watch: also works, same re-render behavior for direct value', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { accountType: 'personal' }
            }));

            let renderCount = 0;
            const { result: accountTypeResult } = renderHook(() => {
                renderCount++;
                return useWatch({ control: formResult.current.control, name: 'accountType' });
            });

            expect(accountTypeResult.current).toBe('personal');

            act(() => {
                formResult.current.setValue('accountType', 'business');
            });

            expect(accountTypeResult.current).toBe('business');
            expect(renderCount).toBe(2); // Same as useFormValue
        });
    });

    describe('Scenario: Conditional rendering based on value', () => {
        it('useFormSelector: prevents re-render when boolean stays same', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { accountType: 'personal', plan: 'starter' }
            }));

            let renderCount = 0;
            const { result: showBusinessResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.accountType === 'business'
                );
            });

            expect(showBusinessResult.current).toBe(false);
            const initialRenderCount = renderCount;

            // Change unrelated field - boolean stays false
            act(() => {
                formResult.current.setValue('plan', 'pro');
            });

            expect(showBusinessResult.current).toBe(false);
            expect(renderCount).toBe(initialRenderCount);
        });

        it('watch: always re-renders when the watched value changes, even if derived result is unchanged', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { accountType: 'personal', plan: 'starter' }
            }));

            let renderCount = 0;
            const { result: combinedResult } = renderHook(() => {
                renderCount++;
                const accountType = useWatch({ control: formResult.current.control, name: 'accountType' });
                return accountType === 'business';
            });

            expect(combinedResult.current).toBe(false);
            const initialRenderCount = renderCount;

            act(() => {
                formResult.current.setValue('accountType', 'individual');
            });

            expect(combinedResult.current).toBe(false);
            expect(renderCount).toBe(initialRenderCount + 1);
        });
    });

    describe('Scenario: Controlled input', () => {
        it('watch and useFormValue: both correctly track value changes for controlled inputs', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { username: '' }
            }));

            // For controlled inputs, you want to re-render on every value change
            // So both watch and useFormValue are appropriate

            const { result: withWatch } = renderHook(() =>
                useWatch({ control: formResult.current.control, name: 'username' })
            );

            const { result: withFormValue } = renderHook(() =>
                useFormValue(formResult.current.control, 'username')
            );

            expect(withWatch.current).toBe('');
            expect(withFormValue.current).toBe('');

            // Both update correctly
            act(() => {
                formResult.current.setValue('username', 'john');
            });

            expect(withWatch.current).toBe('john');
            expect(withFormValue.current).toBe('john');
        });
    });

    describe('Decision Matrix', () => {
        it('useFormSelector: Derived boolean prevents unnecessary re-renders', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { accountType: 'personal', hasCompany: false }
            }));

            let renderCount = 0
            // Derived boolean - prevents unnecessary re-renders
            const { result: showCompanyResult } = renderHook(() => {
                renderCount++
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.accountType === 'business' || s.values.hasCompany
                )
            }
            );

            const initialRenderCount = renderCount

            act(() => {
                formResult.current.setValue('accountType', 'individual')
            })

            expect(renderCount).toBe(initialRenderCount)
            expect(showCompanyResult.current).toBe(false)
        });
    });
});

describe('Real-world Pattern: Account Type Form', () => {
    it('pattern 1: using watch for accountType (more re-renders)', () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { accountType: 'personal', name: '', company: '' }
        }));

        let renderCount = 0;
        const { result: formState } = renderHook(() => {
            renderCount++;
            const accountType = useWatch({
                control: formResult.current.control,
                name: 'accountType'
            });

            return {
                accountType,
                showCompanyField: accountType === 'business'
            };
        });

        expect(renderCount).toBe(1);

        act(() => {
            formResult.current.setValue('accountType', 'nonprofit');
        });

        expect(formState.current.showCompanyField).toBe(false);
        expect(renderCount).toBe(2);
    });

    it('pattern 2: using useFormValue + useFormSelector', () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { accountType: 'personal', name: '', company: '' }
        }));

        let renderCount = 0;
        const { result: formState } = renderHook(() => {
            renderCount++;

            const accountType = useFormValue(
                formResult.current.control,
                'accountType'
            );

            const showCompanyField = useFormSelector(
                formResult.current.control,
                s => s.values.accountType === 'business'
            );

            return { accountType, showCompanyField };
        });

        expect(renderCount).toBe(1);

        act(() => {
            formResult.current.setValue('accountType', 'nonprofit');
        });

        expect(formState.current.accountType).toBe('nonprofit');
        expect(formState.current.showCompanyField).toBe(false);
        expect(renderCount).toBe(2);
    });

    it('pattern 3: full useFormSelector', () => {
        const { result: formResult } = renderHook(() => useForm({
            defaultValues: { accountType: 'personal', name: '', company: '' }
        }));

        let renderCount = 0;
        const { result: showCompanyResult } = renderHook(() => {
            renderCount++;

            // Only subscribe to the derived boolean, not the raw value
            return useFormSelector(
                formResult.current.control,
                s => s.values.accountType === 'business'
            );
        });

        expect(renderCount).toBe(1);

        act(() => {
            formResult.current.setValue('accountType', 'nonprofit');
        });

        expect(showCompanyResult.current).toBe(false);
        expect(renderCount).toBe(1);

        act(() => {
            formResult.current.setValue('accountType', 'business');
        });

        expect(showCompanyResult.current).toBe(true);
        expect(renderCount).toBe(2);
    });
});