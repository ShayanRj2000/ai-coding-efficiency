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
