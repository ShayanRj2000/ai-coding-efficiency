```diff
--- a/orders.ts
+++ b/orders.ts
@@ -1,4 +1,4 @@
 export interface Order { id: string; price: number; quantity: number; }
 export function totalValue(orders: readonly Order[]): number {
-  return orders.reduce((total, order) => total + order.price, 0);
+  return orders.reduce((total, order) => total + order.price * order.quantity, 0);
 }
```

In-memory checks passed: example → `46`, empty list → `0`, fractional values → `3.75`. Frozen inputs remained unchanged; the public API is unchanged.

Patch returned without applying it because the workspace is read-only.