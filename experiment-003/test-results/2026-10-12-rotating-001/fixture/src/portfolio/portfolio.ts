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
