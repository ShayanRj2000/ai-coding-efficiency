import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
import { isWorkingOrder, remainingQuantity } from './order-status';

/**
 * Builds the snapshot used by both the Angular screen and CSV preview.
 * Return a new result; order records and user filters belong to shared stores.
 * This implementation predates partial fills and account switching.
 */
export function summarizeOrderExposure(
  orders: readonly Order[],
  filter: ExposureFilter,
): ExposureSnapshot {
  const rows: SymbolExposure[] = orders.map(order => ({
    symbol: order.symbol,
    buyQuantity: order.side === 'buy' ? order.quantity : 0,
    sellQuantity: order.side === 'sell' ? order.quantity : 0,
    buyNotional: order.side === 'buy' ? order.price : 0,
    sellNotional: order.side === 'sell' ? order.price : 0,
    netNotional: order.price,
  }));
  return {
    accountId: filter.accountId,
    rows,
    totalBuyNotional: rows.reduce((sum, row) => sum + row.buyNotional, 0),
    totalSellNotional: rows.reduce((sum, row) => sum + row.sellNotional, 0),
    netNotional: rows.reduce((sum, row) => sum + row.netNotional, 0),
  };
}
