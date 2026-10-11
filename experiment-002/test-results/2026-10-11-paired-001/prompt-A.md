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

### src/watchlist/watchlist.ts

export interface WatchlistEntry {
  readonly symbol: string;
  readonly pinned: boolean;
  readonly addedAt: string;
  readonly note: string;
}
export interface WatchlistState {
  readonly name: string;
  readonly entries: readonly WatchlistEntry[];
  readonly search: string;
  readonly selectedSymbol: string | null;
}
export type WatchlistAction =
  | { readonly type: 'add'; readonly entry: WatchlistEntry }
  | { readonly type: 'remove'; readonly symbol: string }
  | { readonly type: 'pin'; readonly symbol: string; readonly pinned: boolean }
  | { readonly type: 'select'; readonly symbol: string | null }
  | { readonly type: 'search'; readonly query: string }
  | { readonly type: 'rename'; readonly name: string };

export function reduceWatchlist(state: WatchlistState, action: WatchlistAction): WatchlistState {
  switch (action.type) {
    case 'add':
      return state.entries.some(entry => entry.symbol === action.entry.symbol)
        ? state : { ...state, entries: [...state.entries, action.entry] };
    case 'remove':
      return { ...state, entries: state.entries.filter(entry => entry.symbol !== action.symbol),
        selectedSymbol: state.selectedSymbol === action.symbol ? null : state.selectedSymbol };
    case 'pin':
      return { ...state, entries: state.entries.map(entry => entry.symbol === action.symbol
        ? { ...entry, pinned: action.pinned } : entry) };
    case 'select': return { ...state, selectedSymbol: action.symbol };
    case 'search': return { ...state, search: action.query.trim() };
    case 'rename': return { ...state, name: action.name.trim() || 'Watchlist' };
  }
}

export function visibleWatchlist(state: WatchlistState): readonly WatchlistEntry[] {
  const query = state.search.toUpperCase();
  return state.entries.filter(entry => entry.symbol.toUpperCase().includes(query))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned)
      || left.symbol.localeCompare(right.symbol));
}

### src/preferences/preferences.ts

export type ColorMode = 'light' | 'dark' | 'system';
export type TableDensity = 'compact' | 'comfortable';
export interface Preferences {
  readonly colorMode: ColorMode;
  readonly density: TableDensity;
  readonly locale: 'en' | 'fa';
  readonly showBalances: boolean;
  readonly confirmCancellation: boolean;
  readonly desktopNotifications: boolean;
  readonly keyboardShortcuts: boolean;
  readonly refreshIntervalSeconds: number;
  readonly homeRoute: string;
  readonly hiddenColumns: readonly string[];
}
export const defaultPreferences: Preferences = {
  colorMode: 'system', density: 'comfortable', locale: 'en', showBalances: true,
  confirmCancellation: true, desktopNotifications: false, keyboardShortcuts: true,
  refreshIntervalSeconds: 15, homeRoute: '/overview', hiddenColumns: [],
};

/** Persistence lives outside the reducer to keep browser/storage effects separate. */
export function updatePreferences(current: Preferences, patch: Partial<Preferences>): Preferences {
  const interval = patch.refreshIntervalSeconds ?? current.refreshIntervalSeconds;
  return {
    ...current, ...patch,
    refreshIntervalSeconds: Math.max(5, Math.min(300, interval)),
    hiddenColumns: patch.hiddenColumns ? [...new Set(patch.hiddenColumns)] : current.hiddenColumns,
  };
}

export function parsePreferences(serialized: string | null): Preferences {
  if (!serialized) return defaultPreferences;
  try {
    const input: unknown = JSON.parse(serialized);
    if (!input || typeof input !== 'object') return defaultPreferences;
    const fields = input as Record<string, unknown>;
    return updatePreferences(defaultPreferences, {
      colorMode: fields['colorMode'] === 'dark' || fields['colorMode'] === 'light'
        ? fields['colorMode'] : 'system',
      density: fields['density'] === 'compact' ? 'compact' : 'comfortable',
      locale: fields['locale'] === 'fa' ? 'fa' : 'en',
      showBalances: typeof fields['showBalances'] === 'boolean' ? fields['showBalances'] : true,
      refreshIntervalSeconds: typeof fields['refreshIntervalSeconds'] === 'number'
        && Number.isFinite(fields['refreshIntervalSeconds']) ? fields['refreshIntervalSeconds'] : 15,
    });
  } catch { return defaultPreferences; }
}

### src/notifications/notification-center.ts

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';
export interface Notification {
  readonly id: string;
  readonly level: NotificationLevel;
  readonly title: string;
  readonly message: string;
  readonly createdAt: number;
  readonly expiresAt: number | null;
  readonly dismissed: boolean;
  readonly actionRoute: string | null;
}
export interface NotificationState {
  readonly items: readonly Notification[];
  readonly unreadIds: readonly string[];
  readonly drawerOpen: boolean;
}
export type NotificationAction =
  | { readonly type: 'received'; readonly notification: Notification }
  | { readonly type: 'dismissed'; readonly id: string }
  | { readonly type: 'read'; readonly ids: readonly string[] }
  | { readonly type: 'drawer'; readonly open: boolean }
  | { readonly type: 'expired'; readonly now: number };

export function reduceNotifications(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'received':
      if (state.items.some(item => item.id === action.notification.id)) return state;
      return { ...state, items: [...state.items, action.notification],
        unreadIds: [...state.unreadIds, action.notification.id] };
    case 'dismissed':
      return { ...state, items: state.items.map(item => item.id === action.id
        ? { ...item, dismissed: true } : item), unreadIds: state.unreadIds.filter(id => id !== action.id) };
    case 'read':
      return { ...state, unreadIds: state.unreadIds.filter(id => !action.ids.includes(id)) };
    case 'drawer': return { ...state, drawerOpen: action.open };
    case 'expired': {
      const items = state.items.filter(item => item.expiresAt === null || item.expiresAt > action.now);
      return { ...state, items, unreadIds: state.unreadIds.filter(id => items.some(item => item.id === id)) };
    }
  }
}

export function visibleNotifications(state: NotificationState): readonly Notification[] {
  return state.items.filter(item => !item.dismissed).sort((a, b) => b.createdAt - a.createdAt);
}

### src/portfolio/portfolio.ts

export interface Holding {
  readonly symbol: string;
  readonly accountId: string;
  readonly shares: number;
  readonly averageCost: number;
  readonly lastPrice: number;
  readonly reservedShares: number;
}
export interface PortfolioState {
  readonly holdings: readonly Holding[];
  readonly selectedAccount: string;
  readonly quoteTimestamp: string | null;
  readonly loading: boolean;
  readonly error: string | null;
}
export type PortfolioAction =
  | { readonly type: 'loading' }
  | { readonly type: 'loaded'; readonly holdings: readonly Holding[] }
  | { readonly type: 'failed'; readonly message: string }
  | { readonly type: 'account'; readonly accountId: string }
  | { readonly type: 'quote'; readonly symbol: string; readonly price: number; readonly timestamp: string };

export function reducePortfolio(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'loading': return { ...state, loading: true, error: null };
    case 'loaded': return { ...state, holdings: [...action.holdings], loading: false, error: null };
    case 'failed': return { ...state, loading: false, error: action.message };
    case 'account': return { ...state, selectedAccount: action.accountId };
    case 'quote':
      return { ...state, quoteTimestamp: action.timestamp,
        holdings: state.holdings.map(holding => holding.symbol === action.symbol
          ? { ...holding, lastPrice: action.price } : holding) };
  }
}

export interface HoldingRow extends Holding {
  readonly marketValue: number;
  readonly costBasis: number;
  readonly unrealizedProfit: number;
  readonly availableShares: number;
}
export function holdingRows(state: PortfolioState): readonly HoldingRow[] {
  return state.holdings.filter(holding => holding.accountId === state.selectedAccount)
    .map(holding => ({ ...holding,
      marketValue: holding.shares * holding.lastPrice,
      costBasis: holding.shares * holding.averageCost,
      unrealizedProfit: holding.shares * (holding.lastPrice - holding.averageCost),
      availableShares: Math.max(0, holding.shares - holding.reservedShares),
    })).sort((a, b) => b.marketValue - a.marketValue);
}

### src/navigation/navigation.ts

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly shortcut: string | null;
  readonly requiresAccount: boolean;
  readonly badge: 'orders' | 'notifications' | null;
}
export const navigationItems: readonly NavigationItem[] = [
  { id: 'overview', label: 'Overview', route: '/overview', shortcut: 'g o', requiresAccount: false, badge: null },
  { id: 'orders', label: 'Orders', route: '/orders', shortcut: 'g r', requiresAccount: true, badge: 'orders' },
  { id: 'portfolio', label: 'Portfolio', route: '/portfolio', shortcut: 'g p', requiresAccount: true, badge: null },
  { id: 'watchlist', label: 'Watchlist', route: '/watchlist', shortcut: 'g w', requiresAccount: false, badge: null },
  { id: 'notifications', label: 'Notifications', route: '/notifications', shortcut: null, requiresAccount: false, badge: 'notifications' },
  { id: 'preferences', label: 'Preferences', route: '/preferences', shortcut: 'g s', requiresAccount: false, badge: null },
];
export function availableNavigation(accountId: string | null): readonly NavigationItem[] {
  return navigationItems.filter(item => !item.requiresAccount || accountId !== null);
}
export function activeNavigation(route: string): NavigationItem | undefined {
  return navigationItems.find(item => route === item.route || route.startsWith(item.route + '/'));
}
