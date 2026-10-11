import type { ExposureFilter, ExposureSnapshot, Order } from './order.model';
import { summarizeOrderExposure } from './order-exposure';

export interface ExposureCard {
  readonly symbol: string;
  readonly outstandingBuy: number;
  readonly outstandingSell: number;
  readonly netNotional: number;
  readonly bias: 'buy' | 'sell' | 'flat';
}

/** Framework-independent adapter, also used by the export preview. */
export class OrderExposureFacade {
  snapshot(orders: readonly Order[], filter: ExposureFilter): ExposureSnapshot {
    return summarizeOrderExposure(orders, filter);
  }

  cards(snapshot: ExposureSnapshot): readonly ExposureCard[] {
    return snapshot.rows.map(row => ({
      symbol: row.symbol,
      outstandingBuy: row.buyQuantity,
      outstandingSell: row.sellQuantity,
      netNotional: row.netNotional,
      bias: row.netNotional > 0 ? 'buy' : row.netNotional < 0 ? 'sell' : 'flat',
    }));
  }
}
