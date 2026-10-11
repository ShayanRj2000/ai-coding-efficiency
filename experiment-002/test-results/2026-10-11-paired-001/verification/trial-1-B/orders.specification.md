# Outstanding exposure contract

The Angular account screen and export preview share summarizeOrderExposure.
Its exported signature and the order/filter/snapshot interfaces must remain unchanged.
Only src/orders/order-exposure.ts may change.

1. Include only records whose accountId equals filter.accountId.
2. Include only working statuses: new and partially-filled. Exclude filled,
   cancelled, and rejected records even when their quantity is nonzero.
3. Outstanding shares are max(0, quantity - filledQuantity). Ignore records
   with zero outstanding shares; they must not create empty symbol rows.
4. An undefined symbols filter includes all symbols. An empty symbols list
   includes none. A supplied list includes exact matches; duplicates in that
   filter must not duplicate orders. Do not infer a different account.
5. Group all included orders by symbol. Produce exactly one row per symbol,
   sorted ascending by symbol using deterministic lexical ordering.
6. Sum outstanding shares separately for buyQuantity and sellQuantity.
   Buy/sell notional is price * outstanding shares summed for that side.
7. Each row's netNotional is buyNotional - sellNotional. Snapshot totals are
   sums across rows; snapshot.netNotional is totalBuyNotional - totalSellNotional.
   Net notional may be negative or zero. The returned accountId is the filter's.
8. Empty input or no matches returns empty rows and all three totals zero.
9. Prices and quantities are finite nonnegative numbers; fractional prices
   are allowed. Do not round intermediate values or the final result.
10. Never mutate input orders, the input array, or the filter/symbols array.
    The function must also work with frozen inputs. Return a fresh snapshot.

For previewOrders and {accountId: 'alpha'}, expected rows are:

| Symbol | Buy shares | Sell shares | Buy notional | Sell notional | Net |
| --- | ---: | ---: | ---: | ---: | ---: |
| AAA | 7 | 5 | 70 | 52 | 18 |
| BBB | 8 | 0 | 20 | 0 | 20 |

Totals: buy = 90; sell = 52; net = 38. The other account, filled record,
and fully filled working record do not contribute. Selecting only BBB
returns one row and totals buy = 20, sell = 0, net = 20.

Verification checks the specification independently, strict TypeScript
compilation including the Angular component, unchanged exported function
API, and facade/card behavior. Browser rendering and Angular template
compilation are outside this domain-layer experiment.
