# AI Coding Efficiency

Controlled experiments in selecting less context for AI-assisted Angular and TypeScript work, by Shayan Razmjou.

Experiment 001 reduced prompt bytes by **20.7%**, but did **not** demonstrate token savings: median whole-run input + output usage was **45,896 for A** and **61,728 for B**. The increase cannot be attributed to context selection. Its original raw evidence is preserved. See [RESULTS.md](RESULTS.md) for observed measurements and verification limits.

Experiment 002 completed three alternating pairs on a larger Angular/TypeScript task: all six patches passed acceptance. Median whole-run input + output usage was **21,138 for A** and **17,114 for B**, while median elapsed time was **78.05 and 87.85 seconds**. These observations do not isolate context-selection effects or establish general savings.

## Setup

Use Python 3.10 or newer, Node.js 20.19 or newer, and npm. The packer uses only Python's standard library. Verification uses the exact TypeScript, Angular, and RxJS versions in `package.json`; `package-lock.json` fixes the dependency tree. No VS Code installation is needed.

```sh
npm ci --ignore-scripts
python --version
node --version
```

On Linux, use `python3` if that is your interpreter's command. On Windows, use a working Python installation rather than the Microsoft Store alias. The local portable interpreter used for the recorded runs is ignored by Git and is not required to reproduce the tests.

## Pack explicit context

```sh
python context_pack.py --root /path/to/repo --output context.md src/orders.ts:1:80
```

Selections are explicit UTF-8 files or inclusive line ranges inside the root. Absolute paths, relative traversal, and symlinks resolving outside the root are rejected. LF, CRLF, and CR inputs normalize to LF. `--output` saves UTF-8/LF bytes directly, avoiding shell redirection encoding differences. Byte counts and generated prompt SHA-256 hashes come from bytes read back from disk. Counts are not token estimates.

## Verify

```sh
python -B -m unittest discover -v
npm test
npm run verify:001
```

The outside-root tests always run. Only the separate symlink test skips when the operating system lacks support or permission. Python tests also cover CRLF/LF equivalence, Unicode byte counts, saved-file hashes, deterministic regeneration, and refusing modified fixtures.

`npm test` checks the patch verifier, confirms that the larger baseline fails business checks while compiling, validates an independent reference fix, and rejects a partial-fill regression. `verify:001` rechecks the six saved patches using the pinned compiler; it writes new copies under ignored `verification/experiment-001/`, preserving historical evidence.

The implementation passed [Windows and Linux CI](https://github.com/ShayanRj2000/ai-coding-efficiency/actions/runs/38148846913): 18 Python tests, seven verifier tests, and six saved-patch checks on each runner. Local Windows verification skipped only the symlink check when permission was unavailable.

To record all checks as UTF-8/LF logs and JSON, optionally pass an interpreter and output directory:

```sh
npm run verify -- python validation/my-run
```

## Run Experiment 002

The larger task fixes outstanding order exposure consumed by an Angular component and facade. A provides 13 files, including unrelated watchlist, portfolio, preferences, navigation, and notifications code. B provides the same eight relevant files. Read the [frozen protocol](experiment-002/README.md) before running.

Install and authenticate the Codex CLI separately. Both conditions use `gpt-6.1-sol`, `xhigh` reasoning, identical task instructions, one allowed patch file, and identical acceptance criteria. The runner uses fresh ephemeral sessions, disables shell/web tools and project instructions, and alternates A/B, B/A, A/B across three pairs.

```sh
python prepare_experiment_002.py
npm run experiment:002 -- UNIQUE_RUN_ID
npm run report:002 -- UNIQUE_RUN_ID
node scripts/audit_evidence.cjs UNIQUE_RUN_ID
```

Every run ID must be new: existing result directories are never overwritten. Preparation writes deterministic LF prompts and hashes actual saved bytes. The runner validates those hashes, snapshots the fixture and prompts, then records provider usage, elapsed time, raw responses, events, and independent correctness. Verification covers strict TypeScript compilation including Angular declarations, exported API preservation, filtering/grouping/partial fills, frozen inputs, and facade consumption. It does not run a browser or compile the Angular template.

The report updates only Experiment 002's section in `RESULTS.md`. Historical Experiment 001 scripts refuse to overwrite its completed evidence. To exercise its generator without changing history, use `python prepare_experiment.py --destination verification/generated-001`.

## Interpret measurements

| Measure | Source |
| --- | --- |
| Input, cached input, output, reasoning tokens | Codex CLI `turn.completed` usage; unavailable fields stay unknown |
| Elapsed time | Process start to exit, excluding independent verification |
| Correctness and scope | Applied patch, strict compiler, independent acceptance checks |
| Prompt bytes, characters, SHA-256 | Actual saved UTF-8 bytes |

Whole-run Codex totals include more than the supplied context. Cached input is already part of input tokens, and reasoning output is already part of output; neither is added twice. Fresh sessions do not guarantee cold caches. Three pairs on a single synthetic task cannot establish general token or monetary savings.

Only synthetic or public code belongs here. Explicit selection does not detect or remove secrets.
