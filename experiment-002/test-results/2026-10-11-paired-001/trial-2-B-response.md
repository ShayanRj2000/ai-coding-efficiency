```diff
diff --git a/src/orders/order-exposure.ts b/src/orders/order-exposure.ts
--- a/src/orders/order-exposure.ts
+++ b/src/orders/order-exposure.ts
@@ -1,28 +1,69 @@
 import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
 import { isWorkingOrder, remainingQuantity } from './order-status';
 
 /**
  * Builds the snapshot used by both the Angular screen and CSV preview.
  * Return a new result; order records and user filters belong to shared stores.
- * This implementation predates partial fills and account switching.
+ * Includes only outstanding shares from working orders in the selected account.
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
+  const grouped = new Map<string, {
+    buyQuantity: number;
+    sellQuantity: number;
+    buyNotional: number;
+    sellNotional: number;
+  }>();
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
+    const exposure = grouped.get(order.symbol) ?? {
+      buyQuantity: 0,
+      sellQuantity: 0,
+      buyNotional: 0,
+      sellNotional: 0,
+    };
+    const notional = order.price * quantity;
+    if (order.side === 'buy') {
+      exposure.buyQuantity += quantity;
+      exposure.buyNotional += notional;
+    } else {
+      exposure.sellQuantity += quantity;
+      exposure.sellNotional += notional;
+    }
+    grouped.set(order.symbol, exposure);
+  }
+
+  const rows: SymbolExposure[] = Array.from(grouped, ([symbol, exposure]) => ({
+    symbol,
+    ...exposure,
+    netNotional: exposure.buyNotional - exposure.sellNotional,
+  })).sort((left, right) =>
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

Verification by inspection: preview rows match the specification, with totals **90 / 52 / 38**; BBB-only totals are **20 / 0 / 20**. Filtering, lexical sorting, frozen-input compatibility, and consumer/API compatibility are preserved. No tools, tests, or compilation were run.