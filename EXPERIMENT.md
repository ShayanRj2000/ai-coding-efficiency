# Experiment 001: selecting context

Status: initial pilot completed on 2026-10-11; three paired model trials and local verification recorded in [RESULTS.md](RESULTS.md).

## Question

Does selecting relevant files reduce total reported token usage for a TypeScript bug fix without reducing correctness?

## Synthetic fixture

Create these files in a disposable directory. This is a small TypeScript exercise for an Angular domain layer, not a complete Angular application.

`orders.ts`
```typescript
export interface Order { id: string; price: number; quantity: number; }
export function totalValue(orders: readonly Order[]): number {
  return orders.reduce((total, order) => total + order.price, 0);
}
```

`orders.specification.md`
```text
totalValue returns the sum of price * quantity.
An empty list returns zero. Inputs must not be mutated.
Example: [{id: 'a', price: 12, quantity: 3},
          {id: 'b', price: 5, quantity: 2}] => 46.
Fractional values are allowed; no rounding is required.
```

`theme.ts` (unrelated context)
```typescript
export const theme = { spacing: 8, primary: '#1565c0', radius: 4 };
```

`navigation.ts` (unrelated context)
```typescript
export const navigation = ['Overview', 'Orders', 'Settings'];
```

## Conditions

- A: include all four fixture files.
- B: include only orders.ts and orders.specification.md.

Use identical task wording in both conditions:

> Fix totalValue to satisfy the specification. Keep its public API unchanged. Return the patch and a short verification summary.

Use the packer to create both context payloads. Attach the same task to each payload. Record payload bytes for transparency; these do not establish model token savings.

## Run protocol

1. Record the exact model identifier, tool/version, settings, date, fixture checksum and usage source.
2. Use a fresh session and the same unchanged fixture for every run. Supply only that condition's payload. For this initial test, disable repository/tool access equally in both conditions so the model cannot read excluded files.
3. Run at least three paired trials. Alternate order A/B and B/A. Record cache state when visible; a new conversation does not guarantee a cold cache.
4. Apply and review the returned patch in a disposable copy. Check empty input, the example result 46, fractional multiplication and unchanged inputs. Record the commands or manual checks actually used.
5. If a run fails, allow at most one correction with the same acceptance criteria. Include correction usage and time in the run total. Preserve the failed attempt.
6. Record all runs in RESULTS.md. Keep unavailable usage fields unknown. Do not mix different models in one comparison.
7. Report correctness for all trials and median usage across comparable runs. Report unsuccessful runs too; do not choose only the best result.

## Interpretation

This tiny task is a pilot. Even a positive result cannot establish general savings on a production Angular repository. Later experiments should include tasks that need imports, call sites and broader architectural context, where selecting too little context can hurt quality.
