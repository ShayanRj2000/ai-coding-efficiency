```diff
--- a/src/orders/order-exposure.ts
+++ b/src/orders/order-exposure.ts
@@ -4,25 +4,52 @@
 /**
  * Builds the snapshot used by both the Angular screen and CSV preview.
  * Return a new result; order records and user filters belong to shared stores.
- * This implementation predates partial fills and account switching.
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
+  const rowsBySymbol = new Map<string, SymbolExposure>();
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
+    if (quantity === 0) {
+      continue;
+    }
+
+    const previous = rowsBySymbol.get(order.symbol);
+    const notional = order.price * quantity;
+    const buyNotional = (previous?.buyNotional ?? 0) + (order.side === 'buy' ? notional : 0);
+    const sellNotional = (previous?.sellNotional ?? 0) + (order.side === 'sell' ? notional : 0);
+    rowsBySymbol.set(order.symbol, {
+      symbol: order.symbol,
+      buyQuantity: (previous?.buyQuantity ?? 0) + (order.side === 'buy' ? quantity : 0),
+      sellQuantity: (previous?.sellQuantity ?? 0) + (order.side === 'sell' ? quantity : 0),
+      buyNotional,
+      sellNotional,
+      netNotional: buyNotional - sellNotional,
+    });
+  }
+
+  const rows = Array.from(rowsBySymbol.values()).sort((left, right) =>
+    left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0,
+  );
+  const totalBuyNotional = rows.reduce((sum, row) => sum + row.buyNotional, 0);
+  const totalSellNotional = rows.reduce((sum, row) => sum + row.sellNotional, 0);
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

Manual verification: preview rows match AAA `(7, 5, 70, 52, 18)` and BBB `(8, 0, 20, 0, 20)`, with totals `90 / 52 / 38`. BBB-only totals are `20 / 0 / 20`.

Reviewed filtering, empty results, lexical ordering, frozen-input compatibility, and unchanged API/facade behavior. No tools, compilation, or tests were run.