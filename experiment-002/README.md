# Experiment 002 protocol

This experiment compares full fixture context with explicit relevant-file selection for the same Angular/TypeScript bug fix. The fixture spans 13 files and multiple application features. The model must fix `summarizeOrderExposure` in `src/orders/order-exposure.ts`; account isolation, working statuses, remaining quantities, symbol filters, grouping, sorting, totals, and immutable inputs are specified before execution.

| Control | Both A and B |
| --- | --- |
| Model / reasoning | `gpt-6.1-sol` / `xhigh` |
| Task instructions | Exact same `task.md` bytes |
| Relevant files | Exact same eight complete files |
| Allowed change | Only `src/orders/order-exposure.ts`; exported API unchanged |
| Acceptance | Same frozen `scripts/exposure_acceptance.cjs` |
| Sessions | Fresh ephemeral CLI invocation per run; user config ignored |
| Tools | Shell and web disabled; no project instructions; empty working directory |
| Response | Unified diff plus short verification explanation |
| Corrections / timeout | Zero correction turns; 300 seconds per run |
| Order | Pair 1 A/B, pair 2 B/A, pair 3 A/B |

A includes the relevant order model, status helpers, exposure function, facade, Angular component, template, examples, and specification, plus unrelated watchlist/preferences/notifications/portfolio/navigation files. B omits those five unrelated files. Both include all information needed for the same criteria. This is a larger synthetic application task, not a production workload.

The acceptance verifier uses literal expected results for eleven business cases, deeply frozen inputs, a facade consumer, fresh snapshot checks, strict TypeScript compilation with pinned Angular declarations, and an exported API comparison. Its reference fix lives under `tests/` and is excluded from both prompts. Before trials, tests verify that the baseline compiles but fails behavior, the reference passes, and ignoring partial fills is rejected. No browser or Angular template compiler is used.

Preparation records actual prompt byte counts and SHA-256 hashes, raw fixture hashes, and a protocol hash. The runner validates them before execution and records hashes of the acceptance verifier, patch/compiler code, and lockfile. Evidence snapshots make the tested inputs reviewable. Neither fixture, criteria, nor settings are adjusted between the six runs.

Elapsed time covers model-process start through exit. `turn.completed` supplies whole-run input, cached input, output, and reasoning output tokens when exposed. Missing fields remain unknown. Cached input is included in input and reasoning is included in output. Cache state is not controlled, and whole-run totals cannot isolate context-selection effects. The derived report lists every run, condition medians, paired differences, and pass/fail independently.

```sh
npm ci --ignore-scripts
python -B -m unittest discover -v
npm test
python prepare_experiment_002.py
npm run experiment:002 -- UNIQUE_RUN_ID
npm run report:002 -- UNIQUE_RUN_ID
```

Use a fresh ID for each six-run experiment. Existing evidence directories are never overwritten, even after partial failures. Authentication uses the existing Codex login; no credential values belong in prompts or recorded artifacts.
