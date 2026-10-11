import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
import { isWorkingOrder, remainingQuantity } from './order-status';

/**
 * Builds the snapshot used by both the Angular screen and CSV preview.
 * Return a new result; order records and user filters belong to shared stores.
 * Aggregates outstanding working orders for the selected account and symbols.
 */
export function summarizeOrderExposure(
  orders: readonly Order[],
  filter: ExposureFilter,
): ExposureSnapshot {
  const selectedSymbols = filter.symbols === undefined ? undefined : new Set(filter.symbols);
  const exposureBySymbol = new Map<string, SymbolExposure>();

  for (const order of orders) {
    if (
      order.accountId !== filter.accountId ||
      !isWorkingOrder(order) ||
      (selectedSymbols !== undefined && !selectedSymbols.has(order.symbol))
    ) {
      continue;
    }

    const outstanding = remainingQuantity(order);
    if (outstanding === 0) continue;

    const previous = exposureBySymbol.get(order.symbol);
    const isBuy = order.side === 'buy';
    const notional = order.price * outstanding;
    const buyNotional = (previous?.buyNotional ?? 0) + (isBuy ? notional : 0);
    const sellNotional = (previous?.sellNotional ?? 0) + (isBuy ? 0 : notional);

    exposureBySymbol.set(order.symbol, {
      symbol: order.symbol,
      buyQuantity: (previous?.buyQuantity ?? 0) + (isBuy ? outstanding : 0),
      sellQuantity: (previous?.sellQuantity ?? 0) + (isBuy ? 0 : outstanding),
      buyNotional,
      sellNotional,
      netNotional: buyNotional - sellNotional,
    });
  }

  const rows: SymbolExposure[] = Array.from(exposureBySymbol.values()).sort((left, right) =>
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
