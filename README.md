# AI Coding Efficiency

[![Windows and Linux verification](https://github.com/ShayanRj2000/ai-coding-efficiency/actions/workflows/verify.yml/badge.svg)](https://github.com/ShayanRj2000/ai-coding-efficiency/actions/workflows/verify.yml)

**An experimental engineering toolkit for explicit context selection and reproducible AI coding trials.**

Coding tasks often depend on contracts spread across files. A smaller prompt can omit a required dependency, while provider-reported token usage and latency include work beyond the supplied context. This toolkit builds inspectable context packs and tests model changes against independent acceptance criteria, recording correctness alongside usage and time.

It is a research and portfolio project built from synthetic TypeScript/Angular tasks. Its measurements support narrow observations, not a promise of faster, cheaper, or production-ready AI coding.

## Quick start: pack one useful line

Run from the repository root with Python 3.10 or newer. No third-party Python packages are needed.

Sample input, already committed as [examples/orders.ts](examples/orders.ts):

```typescript
export function orderValue(price: number, quantity: number): number {
  return price * quantity;
}
```

Exact command:

```sh
python context_pack.py --root examples --output examples/context.generated.md orders.ts:2:2
```

Actual terminal diagnostic (stderr):

```text
Context: 46 characters, 46 bytes; tokens unknown
```

Actual saved output in `examples/context.generated.md`:

```markdown
### orders.ts:2:2

  return price * quantity;
```

The inclusive range selects only line 2. `--output` writes UTF-8/LF directly, avoiding shell-redirection encoding differences. LF, CRLF, and CR inputs normalize to LF. Selections must resolve to files inside the root; traversal and escaping symlinks are rejected. Files/ranges are selected explicitly rather than discovered automatically.

## What the evidence says

Prompt size is measured locally from **actual saved bytes**. Token usage comes from **whole-run Codex CLI usage events**, including overhead beyond the supplied files. These are different measurements.

| Experiment | Prompt bytes A / B | Acceptance A / B | Median input + output A / B | Median seconds A / B |
| --- | ---: | --- | ---: | ---: |
| 001: small TypeScript fix | 797 / 632 | 3/3 / 3/3 | 45,896 / 61,728 | 34.80 / 33.24 |
| 002: Angular order exposure | 19,790 / 9,800 | 3/3 / 3/3 | 21,138 / 17,114 | 78.05 / 87.85 |

Experiment 001 reduced prompt bytes by **20.7%**, but did **not** demonstrate token savings. Its higher B usage cannot be attributed to context selection.

Experiment 002 reduced prompt bytes by **50.5%**. B had lower observed whole-run token usage **and higher median latency**. Both conditions passed acceptance. Three pairs on one synthetic task, uncontrolled cache/provider variance, and whole-run accounting do not establish causality, general efficiency, or monetary savings. Browser rendering and Angular template compilation were not tested.

[RESULTS.md](RESULTS.md) contains every run, settings, pass/fail checks, evidence links, and limitations. Historical experiment files are preserved; [byte-integrity checks](validation/2026-10-12/history-baseline.json) guard against changing them during this update.

## Setup and verification

Use Python 3.10+, Node.js compatible with Angular 20 (`20.19+` on the Node 20 line, `22.12+` on Node 22, or Node 24+), and npm. TypeScript 5.9.3, Angular 20.3.0, and RxJS 7.8.2 are pinned; the lockfile fixes the dependency tree. VS Code is optional.

```sh
npm ci --ignore-scripts
python -B -m unittest discover -v
npm test
npm run verify:001
npm run verify:003
```

Use `python3` on systems where it is the interpreter command. Windows needs a working Python installation rather than the Microsoft Store alias. Python tests cover newline equivalence, Unicode saved-byte metrics, path/range validation, deterministic generation, and protecting completed evidence. Only the separate symlink test skips if support or permission is unavailable; outside-root checks still run.

Node tests validate the response/patch verifiers against broken baselines, independent reference fixes, and plausible regressions. CI runs on Windows and Linux. Saved-response checks reproduce both successes and failures; an intentionally insufficient context is allowed to fail without making CI fail. CI does not invoke models or consume model usage.

For UTF-8/LF test logs and a verification manifest:

```sh
npm run verify -- python verification/local-tests
```

## Experiment 003: context across multiple files

The [predeclared protocol](experiment-003/README.md) asks for coordinated changes to ticket submission and preview code consumed by an Angular component. Correctness depends on account routing, venue lot sizes, directional tick rounding, gateway units, fee calculation, validation precedence, and UI/submission parity.

| Condition | Context |
| --- | --- |
| A | Full fixture: 16 files |
| B | Sufficient focused context: 11 files |
| C | Insufficient focused context: four files, deliberately omitting required contracts and consumers |

Three trials per condition rotate A/B/C, B/C/A, C/A/B. All use identical `gpt-6.1-sol`/`xhigh` settings, task instructions, fresh sessions, acceptance criteria, and zero correction turns. The verifier is tested before models against a broken baseline, a correct reference, and six regressions. C may still infer a correct solution; its outcome is measured rather than assumed.

Model runs require an authenticated Codex CLI and access to the declared model. The CLI version used is recorded. Keep model authentication outside repository files.

```sh
python prepare_experiment_003.py
npm run experiment:003 -- UNIQUE_RUN_ID
npm run report:003 -- UNIQUE_RUN_ID
npm run verify:003
```

Use a fresh run ID: even partial run directories cannot be overwritten. The runner snapshots prompts, fixture, protocol, and execution/acceptance code; records raw responses/events, input/output/cached tokens, elapsed time, correctness, and corrections; and checks that the inputs remain frozen. If model access is unavailable, [status](experiment-003/STATUS.md) and results are marked **pending**, with no fabricated measurements.

Earlier protocols remain available in [EXPERIMENT.md](EXPERIMENT.md) and [Experiment 002](experiment-002/README.md). To exercise the first generator safely, use `python prepare_experiment.py --destination verification/generated-001`. Re-running historical report commands can rewrite derived text; preserve recorded artifacts when conducting new work.

## AI assistance, authorship, and review

Git attributes the recorded commits to `s.razmjouy` in [ShayanRj2000's repository](https://github.com/ShayanRj2000/ai-coding-efficiency). Codex assisted with implementation, synthetic fixtures, tests, documentation, experiment execution, and diff review in the development sessions. Automated tests and CI are recorded; independent human review of every change is not documented. Git attribution alone does not establish which design decisions or code Shayan personally produced. Reviewers can inspect the committed protocols, returned source, acceptance cases, and raw usage evidence.

## Measurement boundaries

- Cached input is already included in input tokens; reasoning output is already included in output. Neither is added twice.
- Fresh sessions do not guarantee cold caches. Missing provider fields remain unknown.
- Elapsed time runs from model-process start through exit, excluding independent verification.
- Acceptance tests establish the declared cases, not exhaustive correctness or production suitability.
- Explicit context selection does not detect or remove secrets; fixtures are synthetic/public code.

See the [toolkit map](docs/TOOLKIT.md) for implementation and evidence layout.
