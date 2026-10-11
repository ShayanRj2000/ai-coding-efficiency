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
