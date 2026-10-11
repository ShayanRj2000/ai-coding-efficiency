# AI Coding Efficiency

Practical experiments in using less context while preserving the quality of AI-assisted software development.

By Shayan Razmjou. Focus: Angular and TypeScript workflows.

**Status: initial pilot completed; three paired model trials recorded in [RESULTS.md](RESULTS.md). No token savings demonstrated.**

## Start here

1. Read [EXPERIMENT.md](EXPERIMENT.md) for the first controlled experiment.
2. Build a focused context file with `python context_pack.py --root /path/to/repo src/orders.ts:1:80 > context.md`.
3. Run both experiment conditions in fresh sessions and record provider-reported usage in [RESULTS.md](RESULTS.md).
4. Judge correctness before claiming efficiency gains.

The packer uses only Python's standard library. It accepts explicit UTF-8 files or inclusive line ranges and reports bytes and characters, **not tokens**. It never scans your whole repository automatically.

## What we measure

| Measure | Source |
| --- | --- |
| Input, cached input, output, reasoning tokens when exposed | Tool/provider usage report; unavailable fields stay unknown |
| Elapsed time and correction turns | Run log |
| Correctness and scope | Acceptance checklist and reviewed diff |
| Context bytes and characters | Local context packer |

Token counts, latency and money are different measures. Cached tokens may already be part of input tokens; do not add them twice. Do not treat a subscription percentage or character count as token usage.

## Scope

Initial experiment: full fixture context versus explicitly selected files for the same TypeScript bug fix used by an Angular interface. Future experiments may compare instruction length, tool output filtering and task decomposition, one factor at a time.

## Verification

`python -m unittest -v test_context_pack.py`

Only synthetic or public code belongs in this repository. Inspect context before sending it to a model. Explicit selection does not detect or remove secrets.
