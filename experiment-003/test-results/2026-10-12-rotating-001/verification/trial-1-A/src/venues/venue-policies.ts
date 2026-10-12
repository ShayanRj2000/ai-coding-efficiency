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
