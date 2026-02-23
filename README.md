# rhf-granular

Computed values and granular subscriptions for React Hook Form.

## Install

```bash
npm install rhf-granular
```

## Before You Start

rhf-granular works by subscribing to specific slices of form state. To get the most out of it, there are a few patterns that will cause unexpected re-renders if you are not aware of them. Read the [footguns](#footguns) section before writing any code.

## Why rhf-granular?

Standard `react-hook-form` is fast, but `watch` and `useWatch` can be blunt instruments.
When you watch a field, the entire component re-renders, even if the value you actually
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

- **Standard way:** `useEffect` + `useWatch` = Render -> Effect -> Render
- **Granular way:** `useFormEffect` = Effect, no render

```tsx
useFormEffect(control, ({ values, isDirty }) => {
  if (values.plan === "enterprise" && isDirty) {
    trackEvent("enterprise_plan_edited");
  }
});
```

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

---

## Footguns

### 1. The initialization double render

You will see components render twice on mount, four times in StrictMode.

Render #1 is the initial React mount. Render #2 is RHF initializing its internal state and registering fields. This is standard RHF behavior and is not a bug. It does not happen in production builds.

### 2. Do not read formState at the top level

Reading any property from `formState` at the top level subscribes the entire component to every form state change, causing the whole tree to re-render on every keystroke.

```tsx
// Every component in the tree re-renders on every keystroke
const {
  formState: { errors, isDirty },
} = useForm();
const {
  formState: { errors },
} = useFormContext();
```

```tsx
// This component re-renders, only when this value changes
const { control } = useFormContext();
const isDirty = useFormSelector(control, (s) => s.isDirty);
const error = useFormSelector(control, (s) => s.errors.username?.message);
```

### 3. Do not use useFormContext for reactive reads

`useFormContext` is safe for pulling out stable references like `control`, `register`, `handleSubmit`, `setValue`, and `trigger`. It is not safe for reactive reads because accessing properties triggers proxy subscriptions on the entire component.

```tsx
// Subscribes the component to everything
const {
  formState: { isDirty },
} = useFormContext();
const values = useFormContext().getValues();
```

```tsx
// Safe, control is a stable reference
const { control } = useFormContext();

// Reactive reads go through useFormSelector
const isDirty = useFormSelector(control, (s) => s.isDirty);
```

Safe to destructure from `useFormContext` or `useForm`:

- `control`
- `register`
- `handleSubmit`
- `setValue`
- `trigger`
- `setError`
- `clearErrors`
- `getFieldState`
- `reset`

### 4. Do not destructure fields from useFieldArray for granular reads

`useFieldArray` manages unique IDs for every row and re-renders on every array mutation. If you only need metadata like the count, use a selector instead.

```tsx
// Re-renders this component on every row add, remove, or reorder
const { fields } = useFieldArray({ control, name: "jobs" });
const count = fields.length;
```

```tsx
// Only re-renders when the count actually changes
const count = useFormSelector(control, (s) => s.values.jobs?.length ?? 0);
```

If you need to render the rows themselves, `useFieldArray` is still correct. Use selectors for derived metadata only.

### 5. Use getFieldState inside useFormSelector for field-level state

`useController` is the right choice when you need a controlled input.
If you only need error, isTouched, or isDirty without a controlled input,
getFieldState inside a selector is more precise.

```tsx
// use this when you need a controlled input
const { field, fieldState } = useController({ name: "username", control });

// use this when you only need field state
const { error, isTouched } = useFormSelector(control, (form) =>
  form.getFieldState("username")
);
```

### 6. Keep selectors focused on leaf values for best performance

`rhf-granular` uses shallow comparison by default, it compares top-level object keys by reference, not deep equality. This means a single level of nesting passes but anything deeper will fail.

```tsx
// passes, top level keys compared by reference
const objA = { b: { c: 1 } };
const objB = { b: { c: 1 } };
shallow(objA, objB); // true

// fails, deeper than one level
const a = { x: { y: { z: 1 } } };
const b = { x: { y: { z: 1 } } };
shallow(a, b); // false
```

If you must return a complex nested object, pass a custom deep equality function as the third argument.

```tsx
import isEqual from "lodash/isEqual";

const address = useFormSelector(control, (s) => s.values.address, {
  equalityFn: isEqual,
});
```
