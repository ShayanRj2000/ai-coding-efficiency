import type {AccountContext} from '../accounts/account.model';
import type {BuildTicketResult, TicketDraft} from './ticket.model';
import {policyFor} from '../venues/venue-policies';
/** Independent verifier reference; never included in model prompts. */
export function buildTicketRequest(draft: TicketDraft, account: AccountContext): BuildTicketResult {
  const policy = policyFor(draft.venue);
  if (!policy) return {ok:false,reason:'UNSUPPORTED_VENUE'};
  if (!account.tradable || draft.accountId !== account.accountId) return {ok:false,reason:'ACCOUNT_UNAVAILABLE'};
  const id = draft.id.trim(), symbol = draft.symbol.trim().toUpperCase();
  if (!id) return {ok:false,reason:'INVALID_ID'};
  if (!symbol) return {ok:false,reason:'INVALID_SYMBOL'};
  const lots = draft.quantity / policy.lotSize;
  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0 || !Number.isInteger(lots) || lots > policy.maxLots) return {ok:false,reason:'INVALID_QUANTITY'};
  if (!Number.isFinite(draft.limitPrice) || draft.limitPrice <= 0) return {ok:false,reason:'INVALID_PRICE'};
  const ticks = draft.side === 'buy' ? Math.floor(draft.limitPrice/policy.tickSize + 1e-9) : Math.ceil(draft.limitPrice/policy.tickSize - 1e-9);
  const priceMinor = Math.round(ticks * policy.tickSize * 100);
  if (priceMinor <= 0) return {ok:false,reason:'INVALID_PRICE'};
  if (!policy.timeInForce.includes(draft.timeInForce)) return {ok:false,reason:'UNSUPPORTED_TIF'};
  const notionalMinor = priceMinor * draft.quantity;
  const feeMinor = Math.ceil(notionalMinor * policy.feeBasisPoints / 10000) + policy.fixedFeeMinor;
  const requiredCashMinor = draft.side === 'buy' ? notionalMinor + feeMinor : 0;
  if (draft.side === 'buy' && requiredCashMinor > account.cashAvailableMinor) return {ok:false,reason:'INSUFFICIENT_CASH'};
  return {ok:true,request:{clientRef:account.routingPrefix+'/'+id,account:account.brokerAccount,
    venue:policy.gatewayCode,symbol,side:draft.side === 'buy' ? 1 : 2,quantity:lots,price:priceMinor,tif:draft.timeInForce},
    amounts:{shares:draft.quantity,lots,priceMinor,notionalMinor,feeMinor,requiredCashMinor}};
}
