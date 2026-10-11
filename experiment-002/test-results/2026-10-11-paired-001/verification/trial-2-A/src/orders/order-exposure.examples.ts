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
