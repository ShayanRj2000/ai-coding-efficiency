import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
import { isWorkingOrder, remainingQuantity } from './order-status';

/**
 * Builds the snapshot used by both the Angular screen and CSV preview.
 * Return a new result; order records and user filters belong to shared stores.
 * Only matching working orders with outstanding shares contribute.
 */
export function summarizeOrderExposure(
  orders: readonly Order[],
  filter: ExposureFilter,
): ExposureSnapshot {
  const symbols = filter.symbols === undefined ? undefined : new Set(filter.symbols);
  const bySymbol = new Map<string, SymbolExposure>();

  for (const order of orders) {
    if (
      order.accountId !== filter.accountId
      || !isWorkingOrder(order)
      || (symbols !== undefined && !symbols.has(order.symbol))
    ) {
      continue;
    }

    const quantity = remainingQuantity(order);
    if (quantity === 0) continue;

    const previous = bySymbol.get(order.symbol);
    const isBuy = order.side === 'buy';
    const notional = order.price * quantity;
    const buyNotional = (previous?.buyNotional ?? 0) + (isBuy ? notional : 0);
    const sellNotional = (previous?.sellNotional ?? 0) + (isBuy ? 0 : notional);

    bySymbol.set(order.symbol, {
      symbol: order.symbol,
      buyQuantity: (previous?.buyQuantity ?? 0) + (isBuy ? quantity : 0),
      sellQuantity: (previous?.sellQuantity ?? 0) + (isBuy ? 0 : quantity),
      buyNotional,
      sellNotional,
      netNotional: buyNotional - sellNotional,
    });
  }

  const rows: SymbolExposure[] = Array.from(bySymbol.values()).sort((left, right) =>
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
