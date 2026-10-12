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
