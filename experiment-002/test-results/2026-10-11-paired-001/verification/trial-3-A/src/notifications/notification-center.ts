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
