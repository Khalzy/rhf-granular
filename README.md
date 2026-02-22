# rhf-granular

Optimized React Hook Form subscriptions with equality-gated re-renders.

## Install

npm install rhf-granular

## Hooks

**useFormSelector**
<br/>
subscribe to derived form state, only re-renders when the result changes

**useFormValue**
<br/>
subscribe to a single field value by path

**useFormEffect**
<br/>
run side effects on form state changes without re-rendering

## Requirements

- React >= 18
- react-hook-form >= 7
