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

Verification: JavaScript-equivalent checks passed for the example (`46`), empty input (`0`), fractional values (`3.125`), and input preservation using frozen inputs. Public API unchanged.