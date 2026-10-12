# Toolkit and evidence map

| Part | Responsibility |
| --- | --- |
| `context_pack.py` | Explicit UTF-8 file/range selection, root confinement, LF normalization |
| `prepare_experiment*.py` | Deterministic prompt preparation and hashes of saved bytes |
| `scripts/artifacts.cjs` | LF writers and byte/hash metrics |
| `scripts/verification.cjs` | Saved diff application, exported API inspection, TypeScript compilation, bounded runtime checks |
| `scripts/ticket_response.cjs` | Experiment 003 complete-file JSON response and scope validation |
| `scripts/ticket_acceptance.cjs` | Independent literal outcomes for the multi-file ticket task |
| `scripts/run_experiment_003.cjs` | Rotating fresh-session runs and raw evidence capture |
| `scripts/report_experiment_003.cjs` | Derived summaries; only Experiment 003's RESULTS section changes |
| `scripts/verify_experiment_003.cjs` | Reproduce saved correctness outcomes and usage/hash checks without model access |
| `scripts/check_history.cjs` | Compare historical raw bytes and the original RESULTS prefix with the before-change baseline |

The lifecycle is **declare → validate verifier → commit protocol → prepare/snapshot → run models → verify outcomes → report → review/publish**. Acceptance and context selection are fixed before model runs. A negative-control failure is data, not a reason to loosen acceptance or replace a trial.

Each run retains raw responses, JSONL provider events, stderr, actual saved-byte metrics, and independent acceptance results. Derived summaries are kept separately from raw events. Input + output is computed for each run and then summarized; cached/reasoning fields are shown separately but not added again.

Experiment directories contain immutable historical inputs and evidence. Transient verification copies and the local Python runtime are ignored by Git. New run IDs prevent accidental replacement of completed or failed attempts. Model credentials remain in the existing CLI/account configuration and are never copied into the repository.

The fixtures contain real TypeScript and Angular decorators, but these acceptance checks do not instantiate Angular components in a browser or run the Angular template compiler. Runtime checks use a bounded VM for deterministic domain functions and facade consumers; this is not a general-purpose security sandbox for hostile code.
