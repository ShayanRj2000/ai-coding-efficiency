import type {AccountContext} from '../accounts/account.model';
import type {BuildTicketResult, TicketDraft, TicketPort, TicketView} from './ticket.model';
import {buildTicketRequest} from './build-ticket-request';
import {presentTicket} from './present-ticket';
export class TicketFacade implements TicketPort {
  preview(draft: TicketDraft, account: AccountContext): TicketView { return presentTicket(draft,account); }
  submission(draft: TicketDraft, account: AccountContext): BuildTicketResult { return buildTicketRequest(draft,account); }
}
