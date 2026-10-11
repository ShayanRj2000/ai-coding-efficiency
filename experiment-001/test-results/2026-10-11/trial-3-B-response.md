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

Verified the JavaScript equivalent: example → `46`, empty list → `0`, fractional values → `0.625`, frozen inputs unchanged. Public API unchanged.