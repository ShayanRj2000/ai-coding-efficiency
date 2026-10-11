Fix totalValue to satisfy the specification. Keep its public API unchanged. Return the patch and a short verification summary.

### orders.ts

export interface Order { id: string; price: number; quantity: number; }
export function totalValue(orders: readonly Order[]): number {
  return orders.reduce((total, order) => total + order.price, 0);
}

### orders.specification.md

totalValue returns the sum of price * quantity.
An empty list returns zero. Inputs must not be mutated.
Example: [{id: 'a', price: 12, quantity: 3},
          {id: 'b', price: 5, quantity: 2}] => 46.
Fractional values are allowed; no rounding is required.
