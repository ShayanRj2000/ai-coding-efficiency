import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft, TicketView} from './ticket.model';
import {buildTicketRequest} from './build-ticket-request';

/** Preview and submission drifted apart when the gateway adapter was introduced. */
export function presentTicket(draft: TicketDraft, account: AccountContext): TicketView {
  const result = buildTicketRequest(draft,account);
  return {canSubmit:true,reason:null,priceLabel:draft.limitPrice.toFixed(2)+' USD',
    quantityLabel:draft.quantity+' shares',estimatedCashMinor:Math.round(draft.limitPrice*draft.quantity*100),
    request:result.ok ? result.request : null};
}
