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
