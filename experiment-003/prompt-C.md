Fix order-ticket preview/submission parity by coordinating `src/tickets/build-ticket-request.ts` and `src/tickets/present-ticket.ts` according to the existing specification, account model, venue policies, and gateway contract. Keep exported signatures unchanged and change only those two files. Return a single JSON object with `files` mapping both exact paths to their complete replacement UTF-8 source strings and `notes` containing a short verification/assumptions string. A JSON code fence is allowed. No tools or repository access are available; use only the context below. If needed information is missing, state assumptions in `notes`; do not request a correction turn.

### src/tickets/build-ticket-request.ts

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

### src/tickets/present-ticket.ts

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

### src/tickets/ticket.model.ts

import type {AccountContext} from '../accounts/account.model';
export type TicketSide = 'buy' | 'sell';
export type TimeInForce = 'DAY' | 'IOC' | 'GTC';
export interface TicketDraft {
  readonly id: string;
  readonly accountId: string;
  readonly venue: string;
  readonly symbol: string;
  readonly side: TicketSide;
  readonly quantity: number;
  readonly limitPrice: number;
  readonly timeInForce: TimeInForce;
}
export type RejectReason = 'UNSUPPORTED_VENUE' | 'ACCOUNT_UNAVAILABLE' | 'INVALID_ID'
  | 'INVALID_SYMBOL' | 'INVALID_QUANTITY' | 'INVALID_PRICE' | 'UNSUPPORTED_TIF' | 'INSUFFICIENT_CASH';
/** Field names follow the legacy gateway; units are defined in wire-contract.md. */
export interface TicketRequest {
  readonly clientRef: string;
  readonly account: string;
  readonly venue: string;
  readonly symbol: string;
  readonly side: 1 | 2;
  readonly quantity: number;
  readonly price: number;
  readonly tif: TimeInForce;
}
export interface TicketAmounts {
  readonly shares: number;
  readonly lots: number;
  readonly priceMinor: number;
  readonly notionalMinor: number;
  readonly feeMinor: number;
  readonly requiredCashMinor: number;
}
export type BuildTicketResult = {readonly ok: true; readonly request: TicketRequest; readonly amounts: TicketAmounts}
  | {readonly ok: false; readonly reason: RejectReason};
export interface TicketView {
  readonly canSubmit: boolean;
  readonly reason: RejectReason | null;
  readonly priceLabel: string;
  readonly quantityLabel: string;
  readonly estimatedCashMinor: number;
  readonly request: TicketRequest | null;
}
export interface TicketPort {
  preview(draft: TicketDraft, account: AccountContext): TicketView;
  submission(draft: TicketDraft, account: AccountContext): BuildTicketResult;
}

### ticket.specification.md

# Ticket preview/submission parity

Fix the two target functions; the Angular consumer and facade must keep their public APIs.
Submission must validate the account and draft, follow the venue policies, and return a correctly routed gateway request with normalized amounts. Preview must use the same accepted request and amounts; it must never enable submission for a rejected draft.

The complete gateway units, validation precedence, fees, routing, and rounding rules are in `src/contracts/wire-contract.md`. Venue data is in `src/venues/venue-policies.ts`; account snapshot semantics are in `src/accounts/account.model.ts`. Those files are authoritative parts of this task.

Only change `src/tickets/build-ticket-request.ts` and `src/tickets/present-ticket.ts`. Do not change their exported function signatures, other fixture files, or the models. Private helpers are allowed. Return fresh results. Do not mutate drafts, accounts, or shared venue policies; tests use frozen inputs.

For accepted drafts, preview must show the accepted normalized price with exactly two decimals followed by ` USD`, quantity as `<shares> shares (<lots> lots)`, and the exact required cash from the builder. Its `request` must equal the submission request. For rejected drafts, preview is `{canSubmit:false, reason:<builder reason>, priceLabel:'', quantityLabel:'', estimatedCashMinor:0, request:null}`.

Inputs conform to the declared string/enum shapes, but numeric values can be nonfinite, nonpositive, fractional, outside venue limits, or below one tick. Treat this as a deterministic synthetic integration task, not financial advice or a production trading specification.
