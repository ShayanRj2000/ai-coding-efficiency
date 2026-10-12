import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft, TicketView} from './ticket.model';
import {TicketFacade} from './ticket.facade';
@Component({selector:'app-ticket',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
  templateUrl:'./ticket.component.html'})
export class TicketComponent implements OnChanges {
  @Input({required:true}) draft!: TicketDraft;
  @Input({required:true}) account!: AccountContext;
  readonly facade = new TicketFacade();
  view: TicketView | null = null;
  ngOnChanges(): void { this.view = this.facade.preview(this.draft,this.account); }
}
