```diff
--- a/orders.ts
+++ b/orders.ts
@@ -3 +3 @@
-  return orders.reduce((total, order) => total + order.price, 0);
+  return orders.reduce((total, order) => total + order.price * order.quantity, 0);
```

Verified the patched body as JavaScript: example → `46`, empty → `0`, fractional case → `3.875`. Frozen inputs remained unchanged. Public API is unchanged.

Patch supplied only; the workspace is read-only.