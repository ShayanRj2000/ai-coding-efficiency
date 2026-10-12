import type {AccountContext} from '../accounts/account.model';
import type {BuildTicketResult, TicketDraft} from './ticket.model';
import {policyFor} from '../venues/venue-policies';

/** The submission path inherited UI units and currently bypasses venue checks. */
export function buildTicketRequest(draft: TicketDraft, account: AccountContext): BuildTicketResult {
  const policy = policyFor(draft.venue);
  if (!policy) return {ok:false,reason:'UNSUPPORTED_VENUE'};
  const notionalMinor = Math.round(draft.limitPrice * draft.quantity * 100);
  return {ok:true,request:{clientRef:draft.id,account:account.accountId,venue:draft.venue,
    symbol:draft.symbol,side:draft.side === 'buy' ? 1 : 2,quantity:draft.quantity,
    price:draft.limitPrice,tif:draft.timeInForce},
    amounts:{shares:draft.quantity,lots:draft.quantity,priceMinor:Math.round(draft.limitPrice*100),
      notionalMinor,feeMinor:0,requiredCashMinor:notionalMinor}};
}
