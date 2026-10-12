import type {AccountContext} from '../accounts/account.model';
import type {BuildTicketResult, TicketDraft} from './ticket.model';
import {policyFor} from '../venues/venue-policies';

/** Validates and normalizes a draft using the venue and gateway contract. */
export function buildTicketRequest(draft: TicketDraft, account: AccountContext): BuildTicketResult {
  const policy = policyFor(draft.venue);
  if (!policy) return {ok: false, reason: 'UNSUPPORTED_VENUE'};

  if (!account.tradable || draft.accountId !== account.accountId) {
    return {ok: false, reason: 'ACCOUNT_UNAVAILABLE'};
  }

  const id = draft.id.trim();
  if (!id) return {ok: false, reason: 'INVALID_ID'};

  const symbol = draft.symbol.trim().toUpperCase();
  if (!symbol) return {ok: false, reason: 'INVALID_SYMBOL'};

  const shares = draft.quantity;
  const lots = shares / policy.lotSize;
  if (!Number.isFinite(shares) || shares <= 0 || !Number.isInteger(lots) || lots > policy.maxLots) {
    return {ok: false, reason: 'INVALID_QUANTITY'};
  }

  if (!Number.isFinite(draft.limitPrice) || draft.limitPrice <= 0) {
    return {ok: false, reason: 'INVALID_PRICE'};
  }

  const isBuy = draft.side === 'buy';
  const tickUnits = draft.limitPrice / policy.tickSize;
  const ticks = isBuy
    ? Math.floor(tickUnits + 1e-9)
    : Math.ceil(tickUnits - 1e-9);
  const priceMinor = Math.round(ticks * policy.tickSize * 100);
  if (priceMinor === 0) return {ok: false, reason: 'INVALID_PRICE'};

  if (!policy.timeInForce.includes(draft.timeInForce)) {
    return {ok: false, reason: 'UNSUPPORTED_TIF'};
  }

  const notionalMinor = priceMinor * shares;
  const feeMinor = Math.ceil(notionalMinor * policy.feeBasisPoints / 10000) + policy.fixedFeeMinor;
  const requiredCashMinor = isBuy ? notionalMinor + feeMinor : 0;
  if (isBuy && requiredCashMinor > account.cashAvailableMinor) {
    return {ok: false, reason: 'INSUFFICIENT_CASH'};
  }

  return {
    ok: true,
    request: {
      clientRef: account.routingPrefix + '/' + id,
      account: account.brokerAccount,
      venue: policy.gatewayCode,
      symbol,
      side: isBuy ? 1 : 2,
      quantity: lots,
      price: priceMinor,
      tif: draft.timeInForce,
    },
    amounts: {
      shares,
      lots,
      priceMinor,
      notionalMinor,
      feeMinor,
      requiredCashMinor,
    },
  };
}
