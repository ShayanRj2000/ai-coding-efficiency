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
