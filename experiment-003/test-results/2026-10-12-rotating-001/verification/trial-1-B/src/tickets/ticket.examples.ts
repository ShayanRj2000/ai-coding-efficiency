import type {AccountContext} from '../accounts/account.model';
import type {TicketDraft} from './ticket.model';
export const sampleAccount: AccountContext = {accountId:'alpha',brokerAccount:'A-42',
  routingPrefix:'paper/alpha',tradable:true,cashAvailableMinor:100000};
export const sampleDraft: TicketDraft = {id:' R-7 ',accountId:'alpha',venue:'PRIMARY',
  symbol:' acme ',side:'buy',quantity:30,limitPrice:12.349,timeInForce:'DAY'};
// Contract example: 3 lots, gateway price 1230, notional 36900, fee 60,
// required cash 36960. Preview: "30 shares (3 lots)" at "12.30 USD".
// Sell at the same UI price rounds up to 1235 and requires zero cash.
