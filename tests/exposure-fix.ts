import type { ExposureFilter, ExposureSnapshot, Order, SymbolExposure } from './order.model';
import { isWorkingOrder, remainingQuantity } from './order-status';

/** Acceptance verifier reference, excluded from every model prompt. */
export function summarizeOrderExposure(
  orders: readonly Order[],
  filter: ExposureFilter,
): ExposureSnapshot {
  const grouped = new Map<string, SymbolExposure>();
  for (const order of orders) {
    if (order.accountId !== filter.accountId || !isWorkingOrder(order)) continue;
    if (filter.symbols !== undefined && !filter.symbols.includes(order.symbol)) continue;
    const quantity = remainingQuantity(order);
    if (quantity === 0) continue;
    const previous = grouped.get(order.symbol) ?? {
      symbol: order.symbol, buyQuantity: 0, sellQuantity: 0,
      buyNotional: 0, sellNotional: 0, netNotional: 0,
    };
    const buyQuantity = previous.buyQuantity + (order.side === 'buy' ? quantity : 0);
    const sellQuantity = previous.sellQuantity + (order.side === 'sell' ? quantity : 0);
    const buyNotional = previous.buyNotional + (order.side === 'buy' ? order.price * quantity : 0);
    const sellNotional = previous.sellNotional + (order.side === 'sell' ? order.price * quantity : 0);
    grouped.set(order.symbol, {symbol: order.symbol, buyQuantity, sellQuantity,
      buyNotional, sellNotional, netNotional: buyNotional - sellNotional});
  }
  const rows = [...grouped.values()].sort((a,b) => a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0);
  const totalBuyNotional = rows.reduce((sum,row) => sum + row.buyNotional,0);
  const totalSellNotional = rows.reduce((sum,row) => sum + row.sellNotional,0);
  return {accountId:filter.accountId, rows, totalBuyNotional, totalSellNotional,
    netNotional: totalBuyNotional - totalSellNotional};
}
