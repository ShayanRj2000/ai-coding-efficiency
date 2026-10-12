# Ticket preview/submission parity

Fix the two target functions; the Angular consumer and facade must keep their public APIs.
Submission must validate the account and draft, follow the venue policies, and return a correctly routed gateway request with normalized amounts. Preview must use the same accepted request and amounts; it must never enable submission for a rejected draft.

The complete gateway units, validation precedence, fees, routing, and rounding rules are in `src/contracts/wire-contract.md`. Venue data is in `src/venues/venue-policies.ts`; account snapshot semantics are in `src/accounts/account.model.ts`. Those files are authoritative parts of this task.

Only change `src/tickets/build-ticket-request.ts` and `src/tickets/present-ticket.ts`. Do not change their exported function signatures, other fixture files, or the models. Private helpers are allowed. Return fresh results. Do not mutate drafts, accounts, or shared venue policies; tests use frozen inputs.

For accepted drafts, preview must show the accepted normalized price with exactly two decimals followed by ` USD`, quantity as `<shares> shares (<lots> lots)`, and the exact required cash from the builder. Its `request` must equal the submission request. For rejected drafts, preview is `{canSubmit:false, reason:<builder reason>, priceLabel:'', quantityLabel:'', estimatedCashMinor:0, request:null}`.

Inputs conform to the declared string/enum shapes, but numeric values can be nonfinite, nonpositive, fractional, outside venue limits, or below one tick. Treat this as a deterministic synthetic integration task, not financial advice or a production trading specification.
