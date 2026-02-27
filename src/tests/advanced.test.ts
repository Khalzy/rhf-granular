import { act, renderHook } from '@testing-library/react';
import { useFieldArray, useForm, type Control, type FieldValues } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { useFormEffect } from '../useFormEffect';
import { useFormSelector } from '../useFormSelector';
import { useFormValue } from '../useFormValue';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { shallow } from '../utils/shallow';

describe('Arrays and Nested Objects - Deep Testing', () => {

    describe('mutating the arrays', () => {
        it('Should only re-render on actual state change (shallow equality)', async () => {
            let renderCount = 0

            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    counter: 0,
                    users: [
                        { name: 'John', age: 30 },
                        { name: 'Jane', age: 25 }
                    ]
                }
            }));

            const data = [
                { name: 'John', age: 30 },
            ]

            const { result: actions } = renderHook(() => useFieldArray({
                control: formResult.current.control,
                name: 'users'
            }));

            const { result: value } = renderHook(() => {
                const users = useFormSelector(formResult.current.control, s => s.values.users.filter((u) => u.age > 28))
                renderCount++
                return users
            })

            const initialRenderCount = renderCount

            act(() => {
                actions.current.replace(data)
            })

            expect(shallow(data, value.current)).toBe(true)
            expect(renderCount).toBe(initialRenderCount)

            await act(async () => {
                actions.current.append({ name: 'Alex', age: 35 })
            })

            const filteredData = [
                { name: 'John', age: 30 },
                { name: 'Alex', age: 35 },
            ]

            expect(shallow(filteredData, value.current)).toBe(true)
            expect(renderCount).toBe(initialRenderCount + 1)
        })
    })

    describe('Array of primitives', () => {
        it('should handle array of strings validation', async () => {
            const { result } = renderHook(() => {
                const { control, trigger, getValues } = useForm<{
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tags: any[]
                }>({
                    mode: 'onChange',
                    defaultValues: { tags: ['react', 'typescript'] },
                    resolver: zodResolver(z.object({
                        tags: z.array(z.string()).min(2, 'Minimum length is 2')
                    }))
                });

                const { remove } = useFieldArray({ control, name: 'tags' });

                const useFieldError = <T extends FieldValues = FieldValues>(control: Control<T>, name: string) => {
                    return useFormSelector(control, s => {
                        const touched = s.touchedFields?.[name]
                        const error = s.errors?.[name]?.message
                        return touched ? error : undefined
                    })
                }

                const touchedError = useFieldError(control, 'tags')
                const error = useFormSelector(control, s => s.errors?.tags?.message);
                const fieldsLength = useFormSelector(control, s => s.values.tags.length);

                return { remove, trigger, error, touchedError, getValues, fieldsLength };
            });

            await act(async () => {
                result.current.remove(1);
                await result.current.trigger('tags');
            });

            expect(result.current.touchedError).toBe(undefined);
            expect(result.current.fieldsLength).toBe(1);
            expect(result.current.error).toBe('Minimum length is 2');
        });

        it('should handle array of strings', () => {
            const { result: formResult } = renderHook(() => useForm<{
                tags: string[] | { value: string }[]
            }>({
                defaultValues: { tags: ['react', 'typescript'] }
            }));

            const { result: tagsResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'tags')
            );

            const { result: mutateArr } = renderHook(() =>
                useFieldArray({ control: formResult.current.control, name: 'tags' })
            );

            expect(tagsResult.current).toEqual(['react', 'typescript']);

            act(() => {
                mutateArr.current.append('testing')
            });

            expect(tagsResult.current).toEqual(['react', 'typescript', 'testing']);
        });

        it('should only re-render when array reference changes', () => {
            const { result: formResult } = renderHook(() => useForm<{
                unrelated: string,
                tags: string[]
            }>({
                defaultValues: { tags: ['react'] }
            }));

            let renderCount = 0;
            const { result: firstTagResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(formResult.current.control, s => s.values.tags[0]);
            });

            const initialRenderCount = renderCount;

            act(() => {
                formResult.current.setValue('unrelated', 'value');
            });

            expect(renderCount).toBe(initialRenderCount);

            act(() => {
                formResult.current.setValue('tags', ['react', 'new']);
            });

            expect(firstTagResult.current).toBe('react');
            expect(renderCount).toBe(initialRenderCount);

            const { result: secondTagResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(formResult.current.control, s => s.values.tags[1]);
            });

            expect(secondTagResult.current).toBe('new');
            expect(renderCount).toBe(initialRenderCount + 1);
        });
    });

    describe('Array of objects', () => {
        it('should handle array of objects', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    users: [
                        { name: 'John', age: 30 },
                        { name: 'Jane', age: 25 }
                    ]
                }
            }));

            const { result: firstNameResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'users.0.name')
            );

            expect(firstNameResult.current).toBe('John');

            act(() => {
                formResult.current.setValue('users.0.name', 'Johnny');
            });

            expect(firstNameResult.current).toBe('Johnny');
        });

        it('should handle adding items to array', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { users: [{ name: 'John' }] }
            }));

            const { result: lengthResult } = renderHook(() =>
                useFormSelector(formResult.current.control, s => s.values.users.length)
            );

            expect(lengthResult.current).toBe(1);

            act(() => {
                const current = formResult.current.getValues('users');
                formResult.current.setValue('users', [...current, { name: 'Jane' }]);
            });

            expect(lengthResult.current).toBe(2);
        });

        it('should handle removing items from array', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    users: [
                        { id: 1, name: 'John' },
                        { id: 2, name: 'Jane' },
                        { id: 3, name: 'Bob' }
                    ]
                }
            }));

            const { result: countResult } = renderHook(() =>
                useFormSelector(formResult.current.control, s => s.values.users.length)
            );

            expect(countResult.current).toBe(3);

            // Remove middle item
            act(() => {
                const current = formResult.current.getValues('users');
                formResult.current.setValue('users', current.filter(u => u.id !== 2));
            });

            expect(countResult.current).toBe(2);

            const remaining = formResult.current.getValues('users');
            expect(remaining).toEqual([
                { id: 1, name: 'John' },
                { id: 3, name: 'Bob' }
            ]);
        });

        it('should handle reordering array items', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    items: ['first', 'second', 'third']
                }
            }));

            const { result: firstItemResult } = renderHook(() => {
                return useFormValue(formResult.current.control, 'items.0')
            });

            expect(firstItemResult.current).toBe('first');

            // Reverse array
            act(() => {
                const current = formResult.current.getValues('items');
                formResult.current.setValue('items', [...current].reverse());
            });

            expect(firstItemResult.current).toBe('third');
        });
    });

    describe('Nested arrays in arrays', () => {
        it('should handle nested arrays', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    matrix: [
                        [1, 2, 3],
                        [4, 5, 6],
                        [7, 8, 9]
                    ]
                }
            }));

            const { result: cellResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'matrix.1.2')
            );

            expect(cellResult.current).toBe(6);

            act(() => {
                formResult.current.setValue('matrix.1.2', 99);
            });

            expect(cellResult.current).toBe(99);
        });

        it('should handle array of arrays of objects', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    groups: [
                        [{ name: 'A1' }, { name: 'A2' }],
                        [{ name: 'B1' }, { name: 'B2' }]
                    ]
                }
            }));

            const { result: nameResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'groups.0.1.name')
            );

            expect(nameResult.current).toBe('A2');

            act(() => {
                formResult.current.setValue('groups.0.1.name', 'Modified');
            });

            expect(nameResult.current).toBe('Modified');
        });
    });

    describe('Deeply nested objects', () => {
        it('should handle 5 levels deep', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    level5: 'deep value'
                                }
                            }
                        }
                    }
                }
            }));

            const { result: deepResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'level1.level2.level3.level4.level5')
            );

            expect(deepResult.current).toBe('deep value');

            act(() => {
                formResult.current.setValue('level1.level2.level3.level4.level5', 'updated');
            });

            expect(deepResult.current).toBe('updated');
        });

        it('should handle mixed nested structures', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    company: {
                        departments: [
                            {
                                name: 'Engineering',
                                teams: [
                                    { name: 'Frontend', members: ['Alice', 'Bob'] },
                                    { name: 'Backend', members: ['Charlie', 'Diana'] }
                                ]
                            }
                        ]
                    }
                }
            }));

            const { result: memberResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'company.departments.0.teams.1.members.0')
            );

            expect(memberResult.current).toBe('Charlie');

            act(() => {
                formResult.current.setValue('company.departments.0.teams.1.members.0', 'Chuck');
            });

            expect(memberResult.current).toBe('Chuck');
        });
    });

    describe('Granular re-render with nested data', () => {
        it('should not re-render when sibling array item changes', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    users: [
                        { id: 1, name: 'John', age: 30 },
                        { id: 2, name: 'Jane', age: 25 }
                    ]
                }
            }));

            let renderCount = 0;
            const { result: firstUserNameResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(formResult.current.control, s => s.values.users[0].name);
            });

            const initialRenderCount = renderCount;

            act(() => {
                formResult.current.setValue('users.1.name', 'Janet');
            });

            expect(firstUserNameResult.current).toBe('John');
            expect(renderCount).toBe(initialRenderCount);
        });

        it('should not re-render when derived boolean stays same despite data change', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    items: [{ status: 'active' }, { status: 'active' }]
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

            act(() => {
                const current = formResult.current.getValues('items');
                formResult.current.setValue('items', [...current, { status: 'active' }]);
            });

            expect(hasActiveResult.current).toBe(true);
            expect(renderCount).toBe(initialRenderCount);
        });
    });

    describe('useFormEffect with arrays', () => {
        it('should fire effect when array changes', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { items: ['a', 'b'] }
            }));

            const callback = vi.fn();

            renderHook(() =>
                useFormEffect(formResult.current.control, (state) => {
                    callback(state?.values.items.length);
                })
            );

            expect(callback).toHaveBeenCalledWith(2); // Initial call

            act(() => {
                formResult.current.setValue('items', ['a', 'b', 'c']);
            });

            expect(callback).toHaveBeenCalledWith(3);
        });

        it('should track nested array mutations', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: {
                    users: [{ name: 'John', active: false }]
                }
            }));

            const activations: boolean[] = [];

            renderHook(() =>
                useFormEffect(formResult.current.control, (state) => {
                    activations.push(state?.values.users[0]?.active || false);
                })
            );

            act(() => {
                formResult.current.setValue('users.0.active', true);
            });

            expect(activations).toEqual([false, true]);
        });
    });

    describe('Edge cases', () => {
        it('should handle selecting two related paths', () => {
            const { result: formResult } = renderHook(() => useForm<{
                optional?: {
                    nested: {
                        deep: unknown
                    }
                }
            }>({
                defaultValues: { optional: undefined }
            }));

            const { result: nestedResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'optional.nested.deep')
            );

            const { result: oneLevelDeepResult } = renderHook(() =>
                useFormSelector(formResult.current.control, (state) => {
                    return state.values.optional
                })
            );

            expect(oneLevelDeepResult.current).toBeUndefined();
            expect(nestedResult.current).toBeUndefined();
        });

        it('should handle undefined nested paths', () => {
            const { result: formResult } = renderHook(() => useForm<{
                optional?: {
                    nested: {
                        deep: unknown
                    }
                }
            }>({
                defaultValues: { optional: undefined }
            }));

            const { result: nestedResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'optional.nested.deep')
            );

            expect(nestedResult.current).toBeUndefined();
        });

        it('should handle null values', () => {
            const { result: formResult } = renderHook(() => useForm<Partial<{
                nullable: { restored: boolean } | null
            }>>({
                defaultValues: { nullable: null }
            }));

            const { result: valueResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'nullable')
            );

            expect(valueResult.current).toBeNull();

            act(() => {
                formResult.current.setValue('nullable', { restored: true });
            });

            expect(valueResult.current).toEqual({ restored: true });
        });

        it('should handle empty arrays', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { items: [] as number[] }
            }));

            const { result: lengthResult } = renderHook(() =>
                useFormSelector(formResult.current.control, s => s.values.items.length)
            );

            expect(lengthResult.current).toBe(0);

            act(() => {
                formResult.current.setValue('items', [1, 2, 3]);
            });

            expect(lengthResult.current).toBe(3);
        });

        it('should handle array with holes (sparse arrays)', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { sparse: [1, , 3] } // eslint-disable-line no-sparse-arrays
            }));

            const { result: secondResult } = renderHook(() =>
                useFormValue(formResult.current.control, 'sparse.1')
            );

            expect(secondResult.current).toBeUndefined();
        });

        it('should handle rapid sequential updates', () => {
            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { counter: 0 }
            }));

            let renderCount = 0;
            const { result: counterResult } = renderHook(() => {
                renderCount++;
                return useFormValue(formResult.current.control, 'counter');
            });

            // Rapid updates
            act(() => {
                for (let i = 1; i <= 10; i++) {
                    formResult.current.setValue('counter', i);
                }
            });

            expect(counterResult.current).toBe(10);
            // Should have batched re-renders (exact count may vary with React batching)
            expect(renderCount).toBeGreaterThan(1);
            expect(renderCount).toBeLessThan(12); // Not 11 (initial + 10 updates)
        });
    });

    describe('Performance with large datasets', () => {
        it('should handle 100 item array efficiently', () => {
            const items = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
                value: i * 10
            }));

            const { result: formResult } = renderHook(() => useForm({
                defaultValues: { items }
            }));

            let renderCount = 0;
            const { result: specificItemResult } = renderHook(() => {
                renderCount++;
                return useFormSelector(
                    formResult.current.control,
                    s => s.values.items.find(item => item.id === 50)
                );
            });

            expect(specificItemResult.current).toEqual({ id: 50, name: 'Item 50', value: 500 });

            const initialRenderCount = renderCount;

            // Change item 75 - item 50 selector output stays same
            act(() => {
                formResult.current.setValue('items.75.value', 9999);
            });

            // Selector runs but output is same, should not re-render
            expect(specificItemResult.current).toEqual({ id: 50, name: 'Item 50', value: 500 });
            expect(renderCount).toBe(initialRenderCount); // No re-render
        });
    });
});