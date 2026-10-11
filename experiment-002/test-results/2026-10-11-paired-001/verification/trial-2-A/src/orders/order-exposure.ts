import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
import { isWorkingOrder, remainingQuantity } from './order-status';

/**
 * Builds the snapshot used by both the Angular screen and CSV preview.
 * Return a new result; order records and user filters belong to shared stores.
 * Only working orders with outstanding shares contribute.
 */
export function summarizeOrderExposure(
  orders: readonly Order[],
  filter: ExposureFilter,
): ExposureSnapshot {
  const symbols = filter.symbols === undefined ? undefined : new Set(filter.symbols);
  const bySymbol = new Map<string, SymbolExposure>();

  for (const order of orders) {
    if (
      order.accountId !== filter.accountId ||
      !isWorkingOrder(order) ||
      (symbols !== undefined && !symbols.has(order.symbol))
    ) {
      continue;
    }

    const quantity = remainingQuantity(order);
    if (quantity === 0) continue;

    const row = bySymbol.get(order.symbol);
    const notional = order.price * quantity;
    const buyNotional = (row?.buyNotional ?? 0) + (order.side === 'buy' ? notional : 0);
    const sellNotional = (row?.sellNotional ?? 0) + (order.side === 'sell' ? notional : 0);
    bySymbol.set(order.symbol, {
      symbol: order.symbol,
      buyQuantity: (row?.buyQuantity ?? 0) + (order.side === 'buy' ? quantity : 0),
      sellQuantity: (row?.sellQuantity ?? 0) + (order.side === 'sell' ? quantity : 0),
      buyNotional,
      sellNotional,
      netNotional: buyNotional - sellNotional,
    });
  }

  const rows: SymbolExposure[] = [...bySymbol.values()].sort((left, right) =>
    left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0,
  );
  const totalBuyNotional = rows.reduce((sum, row) => sum + row.buyNotional, 0);
  const totalSellNotional = rows.reduce((sum, row) => sum + row.sellNotional, 0);

  return {
    accountId: filter.accountId,
    rows,
    totalBuyNotional,
    totalSellNotional,
    netNotional: totalBuyNotional - totalSellNotional,
  };
}
