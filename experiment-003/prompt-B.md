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

### src/accounts/account.model.ts

/** A captured account snapshot, owned by the session store. */
export interface AccountContext {
  readonly accountId: string;
  readonly brokerAccount: string;
  readonly routingPrefix: string;
  readonly tradable: boolean;
  /** Already excludes reserved funds; integer USD cents. */
  readonly cashAvailableMinor: number;
}

### src/venues/venue-policies.ts

import type {TimeInForce} from '../tickets/ticket.model';
export interface VenuePolicy {
  readonly gatewayCode: string;
  readonly lotSize: number;
  readonly maxLots: number;
  readonly tickSize: number;
  readonly feeBasisPoints: number;
  readonly fixedFeeMinor: number;
  readonly timeInForce: readonly TimeInForce[];
}
const policies: Readonly<Record<string, VenuePolicy>> = {
  PRIMARY: {gatewayCode: 'P1', lotSize: 10, maxLots: 100, tickSize: 0.05,
    feeBasisPoints: 12, fixedFeeMinor: 15, timeInForce: ['DAY','IOC']},
  ODD: {gatewayCode: 'O2', lotSize: 1, maxLots: 5000, tickSize: 0.01,
    feeBasisPoints: 25, fixedFeeMinor: 0, timeInForce: ['DAY','GTC']},
};
export function policyFor(venue: string): VenuePolicy | undefined {
  return Object.hasOwn(policies,venue) ? policies[venue] : undefined;
}

### src/contracts/wire-contract.md

# Synthetic gateway contract v1

All prices and fees use USD cents. The request's generic field names intentionally differ from the UI units. Read this contract and venue policies together.

Validate in this exact order, returning the first applicable reason:

1. Resolve the exact, case-sensitive venue key. Unknown keys return `UNSUPPORTED_VENUE`.
2. Account must be tradable and `draft.accountId === account.accountId`, otherwise `ACCOUNT_UNAVAILABLE`.
3. Trim the draft ID. Empty IDs return `INVALID_ID`.
4. Trim and uppercase the symbol. Empty symbols return `INVALID_SYMBOL`.
5. Quantity must be finite, positive, and an exact integer number of venue lots (`quantity / lotSize`). Lots must not exceed `maxLots`. Never round quantity; reject with `INVALID_QUANTITY`.
6. UI limit price must be finite and positive. Normalize buy prices DOWN to a venue tick and sell prices UP. Use tolerance `1e-9` in tick units to avoid moving an already aligned binary floating-point price: buy `floor(price/tickSize + 1e-9)`, sell `ceil(price/tickSize - 1e-9)`. Convert normalized price to cents with `round(ticks * tickSize * 100)`. A zero result returns `INVALID_PRICE`.
7. Time in force must appear in the venue policy, otherwise `UNSUPPORTED_TIF`.
8. Compute notional cents as normalized price cents times UI shares. Fee cents = `ceil(notionalMinor * feeBasisPoints / 10000) + fixedFeeMinor`. Required cash = notional + fee for buys, ZERO for sells. A buy requiring more than `cashAvailableMinor` returns `INSUFFICIENT_CASH`; equality is accepted. Sell fees still appear in amounts, but this contract does not require cash for sells.

Accepted gateway fields:

- `clientRef`: `account.routingPrefix + '/' + trimmed draft ID` (case preserved).
- `account`: `account.brokerAccount`, not the UI account ID.
- `venue`: policy `gatewayCode`, not the UI venue key.
- `symbol`: trimmed uppercase symbol.
- `side`: 1 for buy, 2 for sell.
- `quantity`: integer LOT count, not shares.
- `price`: normalized price in CENTS, not the UI decimal price or tick count.
- `tif`: the accepted time-in-force value.

Amounts retain both shares and lots, normalized price cents, notional, fee, and required cash. Build new objects for every call. No rounding of notional beyond the explicitly normalized price is needed for supported venues. No broker calls, holdings checks, FX, real exchange rules, or browser execution are part of acceptance.

### src/tickets/ticket.examples.ts

import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft} from './ticket.model';
export const sampleAccount: AccountContext = {accountId:'alpha',brokerAccount:'A-42',
  routingPrefix:'paper/alpha',tradable:true,cashAvailableMinor:100000};
export const sampleDraft: TicketDraft = {id:' R-7 ',accountId:'alpha',venue:'PRIMARY',
  symbol:' acme ',side:'buy',quantity:30,limitPrice:12.349,timeInForce:'DAY'};
// Contract example: 3 lots, gateway price 1230, notional 36900, fee 60,
// required cash 36960. Preview: "30 shares (3 lots)" at "12.30 USD".
// Sell at the same UI price rounds up to 1235 and requires zero cash.

### src/tickets/ticket.facade.ts

import type {AccountContext} from '../accounts/account.model';
import type {BuildTicketResult, TicketDraft, TicketPort, TicketView} from './ticket.model';
import {buildTicketRequest} from './build-ticket-request';
import {presentTicket} from './present-ticket';
export class TicketFacade implements TicketPort {
  preview(draft: TicketDraft, account: AccountContext): TicketView { return presentTicket(draft,account); }
  submission(draft: TicketDraft, account: AccountContext): BuildTicketResult { return buildTicketRequest(draft,account); }
}

### src/tickets/ticket.component.ts

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

### src/tickets/ticket.component.html

@if (view; as ticket) {
  <section aria-label="Order ticket preview">
    <p>{{ ticket.quantityLabel }} at {{ ticket.priceLabel }}</p>
    <p>Estimated cash (minor units): {{ ticket.estimatedCashMinor }}</p>
    @if (ticket.reason) { <p role="alert">{{ ticket.reason }}</p> }
    <button type="button" [disabled]="!ticket.canSubmit">Submit order</button>
  </section>
}
