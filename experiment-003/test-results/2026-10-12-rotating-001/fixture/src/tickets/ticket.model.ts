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
