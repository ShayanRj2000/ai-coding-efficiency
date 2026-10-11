export interface Order { id: string; price: number; quantity: number; }
export function totalValue(orders: readonly Order[]): number {
  return orders.reduce((total, order) => total + order.price * order.quantity, 0);
}
