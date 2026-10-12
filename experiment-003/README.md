# Experiment 003: sufficient context and missing contracts

This synthetic TypeScript/Angular task fixes order-ticket preview/submission parity across **two source files**. The builder must combine account routing, venue lot/tick policies, gateway units and fees; the preview must reflect the builder's accepted request and rejection state. A standalone Angular component consumes both through a facade.

The objective is to observe correctness, whole-run token usage, and latency when context is complete, sufficient, or deliberately missing necessary contracts. No condition is assumed to succeed or fail.

## Conditions declared before execution

| Condition | Context | Files |
| --- | --- | ---: |
| A | Full fixture, including five unrelated application modules | 16 |
| B | All source/contract files needed for this task | 11 |
| C | Two target functions, ticket types, and the high-level specification | 4 |

C omits the account model, venue policies, gateway contract, worked examples, facade, and Angular component/template. In particular, its supplied context does not establish exact routing fields, gateway units, error precedence, fees, or directional tick rounding. Those omissions are an intentional negative control. A model may still guess or infer a correct implementation; success would not establish that the omitted contracts are generally unnecessary.

All three conditions receive the exact same task instructions and target sources. All returned code is judged against the same full fixture and independent criteria, including rules not supplied to C. Neither the reference implementation nor the verifier is included in any prompt.

## Fixed controls

The machine-readable [protocol](protocol.json) declares `gpt-6.1-sol`, `xhigh` reasoning, fresh ephemeral sessions, ignored user configuration, zero project-instruction bytes, disabled shell/web tools, an empty working directory, read-only sandbox, 300-second timeout, and zero correction turns. The CLI version and settings used are recorded with the runs.

Three trials per condition rotate **A/B/C, B/C/A, C/A/B**. Every condition appears once in each execution position. Cache state and provider/backend variance are uncontrolled. Trials remain in the original order; failures are not replaced with better runs.

The response format is identical across conditions: JSON with complete replacements for the two allowed files and a notes string. This format differs from the earlier experiments, so cross-experiment token/latency comparisons would have additional confounders.

## Independent acceptance, declared before models

The [gateway contract](fixture/src/contracts/wire-contract.md) and [specification](fixture/ticket.specification.md) describe the behavior. [Acceptance code](../scripts/ticket_acceptance.cjs) uses literal numeric expectations and first-error expectations, rather than the production helpers or reference fix as its oracle.

There are 21 business cases: primary buy routing/units/fees; upward sell normalization with zero cash; sells with a negative cash snapshot; odd-lot venue and fractional price; already aligned floating-point price; exact cash equality; fees causing insufficient cash; partial lots; zero quantity; maximum-lot overflow; negative price; buy price below one tick; NaN price; infinite quantity; unsupported venue precedence; case-sensitive venue keys; mismatched account precedence; blocked account; empty-ID precedence; empty-symbol precedence; and unsupported time in force.

Each case checks builder output, preview output, facade parity, and frozen-input preservation. Additional criteria are strict TypeScript compilation including Angular declarations, both unchanged exported APIs, fresh result/request/amount objects, and frozen shared venue policies. Angular template compilation and browser rendering are outside scope.

Before model runs, tests must show that the broken baseline compiles but fails behavior; the independent [reference sources](../tests/ticket-reference/) satisfy the criteria; and six plausible regressions are rejected: sending shares as lots, upward buy rounding, fee truncation, rejecting cash equality, displaying raw preview prices, and enabling invalid drafts.

## Reproduce

```sh
npm ci --ignore-scripts
python -B -m unittest discover -v
npm test
python prepare_experiment_003.py --destination verification/generated-003
npm run experiment:003 -- UNIQUE_RUN_ID
npm run report:003 -- UNIQUE_RUN_ID
npm run verify:003
```

Use `python3` if needed. Model runs require an authenticated Codex CLI and access to the declared model. Tests and CI require neither. `CODEX_CLI_JS` can point to an existing CLI entry when global npm discovery is unsuitable.

The preparation command above exercises deterministic generation in a separate directory. Model runs use the already committed prompts and metrics under `experiment-003/`. The default preparation destination is protected after any recorded attempt, including a partial run.

The protocol and verifier are committed before executing models. The runner stores that commit SHA, hashes the saved bytes, snapshots all supplied contexts and acceptance/execution code, and checks the frozen inputs/code before each trial. New run IDs never overwrite previous runs. Model responses, JSONL usage, stderr, corrections, wall time, and independent acceptance outcomes are retained. `verify:003` reproduces the recorded pass/fail outcomes, including negative-control failures; it does not require every model response to pass.

If model access is unavailable, the runner preserves any actual failed attempt, stops, and the report marks results **pending**. Unexecuted trials have no invented usage or correctness. A complete comparison requires nine completed valid executions.

See [STATUS.md](STATUS.md) and [RESULTS.md](../RESULTS.md#experiment-003-multi-file-ticket-parity). Whole-run usage includes more than the supplied context. Cached input and reasoning are already included; neither is added twice. No monetary cost or general savings claim is made.
