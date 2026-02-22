# rhf-granular

Computed values and granular subscriptions for React Hook Form.

## Install

```bash
npm install rhf-granular
```

## Why rhf-granular?

Standard `react-hook-form` is fast, but `watch` and `useWatch` can be blunt instruments.
When you watch a field, the entire component re-renders — even if the value you actually
care about hasn't changed.

### 1. Derived Values, Fewer Re-renders

Standard `useWatch` triggers a re-render every time a field changes. `useFormSelector`
allows you to derive data and only re-renders if the result of that derivation changes.

```tsx
// Re-renders on every keystroke in the 'plan' field
const { plan } = useWatch({ control });
const isEnterprise = plan === "enterprise";

// Only re-renders when 'plan' flips to/from 'enterprise'
const isEnterprise = useFormSelector(
  control,
  (s) => s.values.plan === "enterprise"
);
```

### 2. Computed Values without Boilerplate

Calculating totals or conditional logic usually requires a `useMemo` wrapped around
a `useWatch`. `rhf-granular` handles this internally, keeping your component logic clean.

```tsx
// Manual memoization
const { plan, seats } = useWatch({ control });
const price = useMemo(() => {
  const base = plan === "enterprise" ? 99 : 29;
  return base * seats;
}, [plan, seats]);

// Handled internally, only re-renders when price changes
const price = useFormSelector(control, ({ values }) => {
  const base = values.plan === "enterprise" ? 99 : 29;
  return base * values.seats;
});
```

### 3. Side-Effects without the Render Cycle

Sometimes you need to trigger an API call or analytics event when a form value changes,
but you don't need to display that value.

- **Standard way:** `useEffect` + `useWatch` = Render → Effect → Render
- **Granular way:** `useFormEffect` = Effect, no render

```tsx
useFormEffect(control, ({ values, isDirty }) => {
  if (values.plan === "enterprise" && isDirty) {
    trackEvent("enterprise_plan_edited");
  }
});
```

### 4. Optimized for Large Forms

As forms grow to 50+ fields, the "render-everything" approach of `watch` causes
noticeable input lag. `rhf-granular` uses a subscription model that bypasses the
component tree until it's absolutely necessary to update the UI.

## Hooks

### useFormSelector

Subscribe to a derived value from form state. Only re-renders when the result changes.

```tsx
const isEnterprise = useFormSelector(
  control,
  (s) => s.values.plan === "enterprise"
);

const price = useFormSelector(control, ({ values }) => {
  const base = values.plan === "enterprise" ? 99 : 29;
  return base * values.seats;
});
```

### useFormValue

Subscribe to a single field value by dot-notation path.

```tsx
const plan = useFormValue(control, "plan");
const firstName = useFormValue(control, "users.0.firstName");
```

### useFormEffect

Run side effects on form state changes without causing re-renders.

```tsx
useFormEffect(control, ({ values, isDirty }) => {
  if (values.plan === "enterprise" && isDirty) {
    trackEvent("enterprise_plan_edited");
  }
});
```

## Requirements

- React >= 18
- react-hook-form >= 7
