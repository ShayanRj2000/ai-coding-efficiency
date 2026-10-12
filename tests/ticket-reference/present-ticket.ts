import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft, TicketView} from './ticket.model';
import {buildTicketRequest} from './build-ticket-request';
export function presentTicket(draft: TicketDraft, account: AccountContext): TicketView {
  const result = buildTicketRequest(draft,account);
  if (!result.ok) return {canSubmit:false,reason:result.reason,priceLabel:'',quantityLabel:'',estimatedCashMinor:0,request:null};
  return {canSubmit:true,reason:null,priceLabel:(result.amounts.priceMinor/100).toFixed(2)+' USD',
    quantityLabel:result.amounts.shares+' shares ('+result.amounts.lots+' lots)',
    estimatedCashMinor:result.amounts.requiredCashMinor,request:result.request};
}
