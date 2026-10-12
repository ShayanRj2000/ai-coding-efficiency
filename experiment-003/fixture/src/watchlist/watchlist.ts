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
