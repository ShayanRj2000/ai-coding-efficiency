```diff
--- a/src/orders/order-exposure.ts
+++ b/src/orders/order-exposure.ts
@@ -1,28 +1,55 @@
 import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
 import { isWorkingOrder, remainingQuantity } from './order-status';
 
 /**
  * Builds the snapshot used by both the Angular screen and CSV preview.
  * Return a new result; order records and user filters belong to shared stores.
- * This implementation predates partial fills and account switching.
+ * Only working orders with outstanding shares contribute.
  */
 export function summarizeOrderExposure(
   orders: readonly Order[],
   filter: ExposureFilter,
 ): ExposureSnapshot {
-  const rows: SymbolExposure[] = orders.map(order => ({
-    symbol: order.symbol,
-    buyQuantity: order.side === 'buy' ? order.quantity : 0,
-    sellQuantity: order.side === 'sell' ? order.quantity : 0,
-    buyNotional: order.side === 'buy' ? order.price : 0,
-    sellNotional: order.side === 'sell' ? order.price : 0,
-    netNotional: order.price,
-  }));
+  const symbols = filter.symbols === undefined ? undefined : new Set(filter.symbols);
+  const bySymbol = new Map<string, SymbolExposure>();
+
+  for (const order of orders) {
+    if (
+      order.accountId !== filter.accountId ||
+      !isWorkingOrder(order) ||
+      (symbols !== undefined && !symbols.has(order.symbol))
+    ) {
+      continue;
+    }
+
+    const quantity = remainingQuantity(order);
+    if (quantity === 0) continue;
+
+    const row = bySymbol.get(order.symbol);
+    const notional = order.price * quantity;
+    const buyNotional = (row?.buyNotional ?? 0) + (order.side === 'buy' ? notional : 0);
+    const sellNotional = (row?.sellNotional ?? 0) + (order.side === 'sell' ? notional : 0);
+    bySymbol.set(order.symbol, {
+      symbol: order.symbol,
+      buyQuantity: (row?.buyQuantity ?? 0) + (order.side === 'buy' ? quantity : 0),
+      sellQuantity: (row?.sellQuantity ?? 0) + (order.side === 'sell' ? quantity : 0),
+      buyNotional,
+      sellNotional,
+      netNotional: buyNotional - sellNotional,
+    });
+  }
+
+  const rows: SymbolExposure[] = [...bySymbol.values()].sort((left, right) =>
+    left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0,
+  );
+  const totalBuyNotional = rows.reduce((sum, row) => sum + row.buyNotional, 0);
+  const totalSellNotional = rows.reduce((sum, row) => sum + row.sellNotional, 0);
+
   return {
     accountId: filter.accountId,
     rows,
-    totalBuyNotional: rows.reduce((sum, row) => sum + row.buyNotional, 0),
-    totalSellNotional: rows.reduce((sum, row) => sum + row.sellNotional, 0),
-    netNotional: rows.reduce((sum, row) => sum + row.netNotional, 0),
+    totalBuyNotional,
+    totalSellNotional,
+    netNotional: totalBuyNotional - totalSellNotional,
   };
 }
```

Verification by inspection: all contract rules are covered, inputs remain untouched, and the exported API and consumer fields are unchanged. Preview totals calculate to **90 / 52 / 38**; BBB-only totals are **20 / 0 / 20**. Tests and strict TypeScript compilation were not run, per the no-tools instruction.