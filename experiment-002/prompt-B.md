Fix summarizeOrderExposure in src/orders/order-exposure.ts to satisfy orders.specification.md and its existing Angular/facade consumers. Change only src/orders/order-exposure.ts. Keep its exported API unchanged. Return a unified diff patch and a short verification summary. All task inputs are supplied below; do not use tools or repository access.

### src/orders/order.model.ts

/** Immutable API records consumed by the order dashboard. Quantities are shares. */
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'new' | 'partially-filled' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  readonly id: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly status: OrderStatus;
  readonly price: number;
  readonly quantity: number;
  readonly filledQuantity: number;
}

/** Undefined symbols means all; an empty list means none. */
export interface ExposureFilter {
  readonly accountId: string;
  readonly symbols?: readonly string[];
}

export interface SymbolExposure {
  readonly symbol: string;
  readonly buyQuantity: number;
  readonly sellQuantity: number;
  readonly buyNotional: number;
  readonly sellNotional: number;
  readonly netNotional: number;
}

export interface ExposureSnapshot {
  readonly accountId: string;
  readonly rows: readonly SymbolExposure[];
  readonly totalBuyNotional: number;
  readonly totalSellNotional: number;
  readonly netNotional: number;
}

### src/orders/order-status.ts

import type { Order, OrderStatus } from './order.model';

/** Closed orders belong to order history, never outstanding exposure. */
export const WORKING_STATUSES: readonly OrderStatus[] = ['new', 'partially-filled'];

export function isWorkingOrder(order: Order): boolean {
  return WORKING_STATUSES.includes(order.status);
}

/** Clamp overfilled API records instead of introducing negative exposure. */
export function remainingQuantity(order: Order): number {
  return Math.max(0, order.quantity - order.filledQuantity);
}

### src/orders/order-exposure.ts

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

### src/orders/order-exposure.facade.ts

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

### src/orders/order-exposure.component.ts

import { ChangeDetectionStrategy, Component, Input, type OnChanges } from '@angular/core';
import type { ExposureSnapshot, Order } from './order.model';
import { OrderExposureFacade, type ExposureCard } from './order-exposure.facade';

@Component({
  selector: 'alpha-order-exposure',
  standalone: true,
  templateUrl: './order-exposure.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderExposureComponent implements OnChanges {
  @Input({ required: true }) accountId = '';
  @Input() orders: readonly Order[] = [];
  @Input() symbols: readonly string[] | undefined;
  readonly facade = new OrderExposureFacade();
  snapshot: ExposureSnapshot = {
    accountId: '', rows: [], totalBuyNotional: 0, totalSellNotional: 0, netNotional: 0,
  };
  cards: readonly ExposureCard[] = [];

  ngOnChanges(): void {
    this.snapshot = this.facade.snapshot(this.orders, {
      accountId: this.accountId, symbols: this.symbols,
    });
    this.cards = this.facade.cards(this.snapshot);
  }
}

### src/orders/order-exposure.component.html

<section aria-label="Outstanding order exposure">
  <header>
    <h2>Account {{ snapshot.accountId }}</h2>
    <dl>
      <dt>Buy notional</dt><dd>{{ snapshot.totalBuyNotional }}</dd>
      <dt>Sell notional</dt><dd>{{ snapshot.totalSellNotional }}</dd>
      <dt>Net notional</dt><dd>{{ snapshot.netNotional }}</dd>
    </dl>
  </header>
  @if (cards.length === 0) {
    <p>No working orders match this account and symbol selection.</p>
  } @else {
    <table>
      <thead><tr><th>Symbol</th><th>Buy shares</th><th>Sell shares</th><th>Net</th></tr></thead>
      <tbody>
        @for (card of cards; track card.symbol) {
          <tr [attr.data-bias]="card.bias">
            <td>{{ card.symbol }}</td>
            <td>{{ card.outstandingBuy }}</td>
            <td>{{ card.outstandingSell }}</td>
            <td>{{ card.netNotional }}</td>
          </tr>
        }
      </tbody>
    </table>
  }
</section>

### src/orders/order-exposure.examples.ts

import type { Order } from './order.model';

/** Sanitized development data shared by the Angular preview and CSV preview. */
export const previewOrders: readonly Order[] = [
  { id: '1', accountId: 'alpha', symbol: 'AAA', side: 'buy', status: 'partially-filled', price: 10, quantity: 10, filledQuantity: 3 },
  { id: '2', accountId: 'alpha', symbol: 'AAA', side: 'sell', status: 'partially-filled', price: 12, quantity: 4, filledQuantity: 1 },
  { id: '3', accountId: 'alpha', symbol: 'BBB', side: 'buy', status: 'new', price: 2.5, quantity: 8, filledQuantity: 0 },
  { id: '4', accountId: 'beta', symbol: 'AAA', side: 'buy', status: 'new', price: 100, quantity: 5, filledQuantity: 0 },
  { id: '5', accountId: 'alpha', symbol: 'AAA', side: 'buy', status: 'filled', price: 20, quantity: 9, filledQuantity: 9 },
  { id: '6', accountId: 'alpha', symbol: 'CCC', side: 'sell', status: 'partially-filled', price: 5, quantity: 10, filledQuantity: 10 },
  { id: '7', accountId: 'alpha', symbol: 'AAA', side: 'sell', status: 'new', price: 8, quantity: 2, filledQuantity: 0 },
];

### orders.specification.md

# Outstanding exposure contract

The Angular account screen and export preview share summarizeOrderExposure.
Its exported signature and the order/filter/snapshot interfaces must remain unchanged.
Only src/orders/order-exposure.ts may change.

1. Include only records whose accountId equals filter.accountId.
2. Include only working statuses: new and partially-filled. Exclude filled,
   cancelled, and rejected records even when their quantity is nonzero.
3. Outstanding shares are max(0, quantity - filledQuantity). Ignore records
   with zero outstanding shares; they must not create empty symbol rows.
4. An undefined symbols filter includes all symbols. An empty symbols list
   includes none. A supplied list includes exact matches; duplicates in that
   filter must not duplicate orders. Do not infer a different account.
5. Group all included orders by symbol. Produce exactly one row per symbol,
   sorted ascending by symbol using deterministic lexical ordering.
6. Sum outstanding shares separately for buyQuantity and sellQuantity.
   Buy/sell notional is price * outstanding shares summed for that side.
7. Each row's netNotional is buyNotional - sellNotional. Snapshot totals are
   sums across rows; snapshot.netNotional is totalBuyNotional - totalSellNotional.
   Net notional may be negative or zero. The returned accountId is the filter's.
8. Empty input or no matches returns empty rows and all three totals zero.
9. Prices and quantities are finite nonnegative numbers; fractional prices
   are allowed. Do not round intermediate values or the final result.
10. Never mutate input orders, the input array, or the filter/symbols array.
    The function must also work with frozen inputs. Return a fresh snapshot.

For previewOrders and {accountId: 'alpha'}, expected rows are:

| Symbol | Buy shares | Sell shares | Buy notional | Sell notional | Net |
| --- | ---: | ---: | ---: | ---: | ---: |
| AAA | 7 | 5 | 70 | 52 | 18 |
| BBB | 8 | 0 | 20 | 0 | 20 |

Totals: buy = 90; sell = 52; net = 38. The other account, filled record,
and fully filled working record do not contribute. Selecting only BBB
returns one row and totals buy = 20, sell = 0, net = 20.

Verification checks the specification independently, strict TypeScript
compilation including the Angular component, unchanged exported function
API, and facade/card behavior. Browser rendering and Angular template
compilation are outside this domain-layer experiment.
