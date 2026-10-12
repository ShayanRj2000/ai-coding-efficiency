import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft, TicketView} from './ticket.model';
import {buildTicketRequest} from './build-ticket-request';

/** Presents the same validated request and normalized amounts used for submission. */
export function presentTicket(draft: TicketDraft, account: AccountContext): TicketView {
  const result = buildTicketRequest(draft, account);
  if (result.ok === false) {
    return {
      canSubmit: false,
      reason: result.reason,
      priceLabel: '',
      quantityLabel: '',
      estimatedCashMinor: 0,
      request: null,
    };
  }

  const {amounts, request} = result;
  return {
    canSubmit: true,
    reason: null,
    priceLabel: (amounts.priceMinor / 100).toFixed(2) + ' USD',
    quantityLabel: amounts.shares + ' shares (' + amounts.lots + ' lots)',
    estimatedCashMinor: amounts.requiredCashMinor,
    request,
  };
}
