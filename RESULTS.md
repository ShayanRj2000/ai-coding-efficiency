# Results

Experiment 001 was observed on 2026-10-11 (Asia/Tehran). Its commands ran in the VS Code integrated terminal. The following first-experiment measurements and raw evidence are preserved.

Three paired trials used gpt-6.1-sol with xhigh reasoning and Codex CLI 0.160.0. Run order: A/B, B/A, A/B. Each run used a fresh ephemeral session, an empty working directory, disabled shell commands and web search, and zero project-instruction bytes. No repository tool calls or correction turns occurred.

## Local verification

- Python 3.12.10: 3 existing unit tests passed, 1 failed, and 1 errored.
- The inclusive-range assertion failed because Windows-created fixtures contain CRLF while the expected output contains LF.
- The symlink check errored with WinError 1314: this Windows account cannot create the required symbolic link. The outside-root rejection ran before that error.
- The generator created prompts, reproduced them on a second run, and refused to overwrite a modified fixture.
- Generator byte/hash metrics did not match the files it wrote on Windows. It measures the string before write_text translates newlines. Existing supplied prompts and stored metrics do match.
- Original TypeScript fixture: the example returns 17 instead of 46, and the fractional case returns 1.5 instead of 3. The experiment intentionally contains this bug.

## Context and model results

| Measurement | A: all four files | B: two relevant files |
| --- | ---: | ---: |
| Prompt bytes / characters | 797 | 632 |
| Patches passing acceptance | 3/3 | 3/3 |
| Median input tokens | 44820 | 60992 |
| Median cached input tokens | 28672 | 41344 |
| Median output tokens | 694 | 736 |
| Median reasoning output tokens | 233 | 213 |
| Median input + output tokens | 45896 | 61728 |
| Median elapsed seconds | 34.80 | 33.24 |

Focused context reduced payload bytes by 165 (20.7%). Token savings were not demonstrated: median input + output usage was 45,896 for A and 61,728 for B, 34.5% higher for B. These are whole-run Codex totals; the increase cannot be attributed to context selection. All returned patches were checked independently for empty input, the example, fractional multiplication, frozen-input preservation, TypeScript compilation, and unchanged public API.

Cached input and reasoning are displayed as reported fields; neither is added again to input + output. These are whole-run CLI usage totals, which do not isolate the pasted fixture's token count. Cache use varied between runs. Three pairs on one tiny synthetic task cannot establish general savings, and monetary cost was not measured.

## Every run

| Trial | Condition | Input | Cached input | Output | Reasoning output | Input + output | Seconds | Acceptance |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | A | 44820 | 28672 | 694 | 233 | 45514 | 34.80 | pass |
| 1 | B | 65017 | 43392 | 654 | 213 | 65671 | 36.02 | pass |
| 2 | B | 60992 | 41344 | 736 | 192 | 61728 | 29.64 | pass |
| 2 | A | 44745 | 13568 | 1151 | 585 | 45896 | 43.79 | pass |
| 3 | A | 53033 | 31616 | 693 | 227 | 53726 | 30.61 | pass |
| 3 | B | 38190 | 24320 | 817 | 368 | 39007 | 33.24 | pass |

## Evidence and reproduction

Fixture checksum: `4049bd3e1943cace443dfa401a1821fd4abc3886299c74df98ca83403177a57c` (SHA-256 over sorted filename, NUL, raw file bytes, NUL).
Prompt A SHA-256: `218a94d8adf3be8c3c10c1552d57061e2188801f7686d52bf13b07a3986d5279`.
Prompt B SHA-256: `4c944426d036c874f2c9a64f37295c3959805c27903e267097c9bd11a70a6090`.

- [Raw trial usage and settings](experiment-001/test-results/2026-10-11/model-trials.json)
- [Independent acceptance checks](experiment-001/test-results/2026-10-11/acceptance-verification.json)
- [Context and generator checks](experiment-001/test-results/2026-10-11/input-verification.json)
- [Unit test output](experiment-001/test-results/2026-10-11/unit-tests.txt)
- [Machine-readable summary](experiment-001/test-results/2026-10-11/summary.json)

Individual returned patches and JSONL usage events are retained beside those files. Patched copies are under verification/; the original source and synthetic fixture were preserved.

A portable Python interpreter was downloaded from Python.org into .test-tools/python because the system python command is an unusable Windows app alias. No system Python installation was changed.

Historical commands used (the completed evidence is now protected from overwrites; use the current README for new runs):

```powershell
.\.test-tools\python\python.exe -B -m unittest -v test_context_pack.py
.\.test-tools\python\python.exe -B .\.test-tools\inspect_experiment.py
node .\.test-tools\run_model_trials.cjs
node .\.test-tools\verify_orders.cjs
.\.test-tools\python\python.exe -B .\.test-tools\summarize_results.py
```

CLI JSONL usage fields follow [official OpenAI documentation](https://learn.chatgpt.com/docs/non-interactive-mode).

## Portability update verification

The updated code was checked on Windows with Python 3.12.10, Node 24.16.0, and the pinned TypeScript 5.9.3. Setup succeeded with both `npm install --ignore-scripts` and `npm ci --ignore-scripts` using the committed lockfile. These commands ran in the tool terminal because the Windows desktop was locked and VS Code could not receive input.

- Python: 18 tests ran; 17 passed and only the symlink test skipped for WinError 1314. Independent absolute and relative outside-root checks passed. LF/CRLF/CR inputs, UTF-8 byte counts, saved hashes, deterministic generation, and protecting recorded evidence passed.
- Node: all seven verifier tests passed. The intentionally broken larger baseline compiled and failed behavioral acceptance; the independent reference passed; a partial-fill regression failed acceptance.
- Experiment 001: all six saved patches passed with the pinned compiler. New verification copies were written outside its historical evidence directory.
- A preflight run caught comment text being included in the exported API comparison. That was fixed before model trials; the [preflight log](validation/2026-10-11/windows-preflight-1/node-tests.txt) is retained alongside the final passing checks.

Final local evidence: [verification manifest](validation/2026-10-11/windows/verification.json), [Python output](validation/2026-10-11/windows/python-tests.txt), [Node output](validation/2026-10-11/windows/node-tests.txt), and [historical-patch recheck](validation/2026-10-11/windows/experiment-001-reverification.txt).

The implementation commit `3c1c445d7cacb47f1a4e3aeeb920418e4b1d8bb4` also passed [GitHub CI on Windows and Linux](https://github.com/ShayanRj2000/ai-coding-efficiency/actions/runs/38148846913). Each runner passed all 18 Python tests, all seven verifier tests, and all six historical patches. The symlink test ran successfully on both hosted runners; only the local Windows account lacked permission. [CI job results and relevant output](validation/2026-10-11/ci-verification.json) retain the observed evidence.

The [integrity audit](validation/2026-10-11/evidence-integrity.json) checks usage against raw events, saved-byte hashes, frozen inputs/verifiers, and historical content against the original commit. Two historical JSON working copies retain CRLF that the original Git commit normalized to LF. Their contents are unchanged; [raw byte hashes and base64 copies](validation/2026-10-11/historical-raw-bytes.json) retain their exact existing bytes without modifying Experiment 001.

Reproduction commands used:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run verify -- .test-tools/python/python.exe validation/2026-10-11/windows
.\.test-tools\python\python.exe -B prepare_experiment_002.py
npm.cmd run experiment:002 -- 2026-10-11-paired-001
npm.cmd run report:002 -- 2026-10-11-paired-001
```

<!-- experiment-002:start -->
## Experiment 002: Angular order exposure

Run `2026-10-11-paired-001` completed at 2026-10-11T14:45:08.700Z. The task groups outstanding buy/sell exposure by symbol, filters account/status/symbols, accounts for partial fills, preserves immutable inputs, and feeds an Angular component through a facade. A includes all 13 fixture files; B includes the same eight relevant files. Both use gpt-6.1-sol, xhigh reasoning, codex-cli 0.160.0, identical instructions and acceptance checks, fresh ephemeral sessions, disabled shell/web tools, and zero project instructions. Execution order was A/B, B/A, A/B; correction turns were zero.

| Measurement | A: 13 files | B: 8 files |
| --- | ---: | ---: |
| Saved prompt bytes | 19790 | 9800 |
| Valid executions | 3/3 | 3/3 |
| Patches passing acceptance | 3/3 | 3/3 |
| Median input tokens | 18179 | 13791 |
| Median cached input tokens | 0 | 0 |
| Median output tokens | 2959 | 2979 |
| Median reasoning output tokens | 2070 | 2057 |
| Median input + output tokens | 21138 | 17114 |
| Median elapsed seconds | 78.05 | 87.85 |

Prompt bytes decreased by 9990 (50.5%). B had lower observed median whole-run input + output usage in these runs. This does not isolate tokens attributable to context selection or establish general savings. These are whole-run Codex totals; differences are not attributed to context selection. Cache state was not controlled. Three pairs on one synthetic domain task provide limited evidence; cost was not measured.

| Trial | Condition | Input | Cached input | Output | Reasoning output | Input + output | Seconds | Acceptance |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | A | 18179 | 0 | 2959 | 2070 | 21138 | 76.82 | pass |
| 1 | B | 15928 | 0 | 2979 | 2057 | 18907 | 87.85 | pass |
| 2 | B | 13791 | 0 | 3323 | 2402 | 17114 | 100.22 | pass |
| 2 | A | 18179 | 0 | 2450 | 1552 | 20629 | 78.05 | pass |
| 3 | A | 18179 | 0 | 3795 | 2907 | 21974 | 114.77 | pass |
| 3 | B | 13791 | 0 | 2428 | 1554 | 16219 | 64.67 | pass |

| Pair | Order | B minus A input + output | B minus A seconds |
| --- | --- | ---: | ---: |
| 1 | A/B | -2231 | 11.03 |
| 2 | B/A | -3515 | 22.17 |
| 3 | A/B | -5755 | -50.10 |

Acceptance includes strict TypeScript compilation with the pinned compiler and Angular declarations, unchanged exported API, eleven business cases with frozen inputs, facade consumption, and fresh snapshots. The verifier was checked against the intentionally broken baseline, an independent reference fix, and a partial-fill regression before any model runs. Browser rendering and Angular template compilation were not tested.

Evidence: [raw usage/settings](experiment-002/test-results/2026-10-11-paired-001/model-trials.json), [derived summary](experiment-002/test-results/2026-10-11-paired-001/summary.json), [frozen context hashes](experiment-002/test-results/2026-10-11-paired-001/context-metrics.json), and individual response, JSONL event, stderr, and acceptance files beside them. Original fixture snapshots and patched verification copies are retained. The [protocol](experiment-002/protocol.json) describes the predeclared controls.
<!-- experiment-002:end -->

<!-- experiment-003:start -->
## Experiment 003: multi-file ticket parity

**Results pending.** The protocol, prompts, verifier, reference tests, and runner are prepared. Provider reported "Selected model is at capacity. Please try a different model." The declared model was kept unchanged. Completed valid trials so far: 1/1/0; no three-condition token or latency comparison is published until all nine finish.

| Measurement | A: full | B: sufficient focused | C: insufficient focused |
| --- | ---: | ---: | ---: |
| Saved prompt bytes | 21919 | 11929 | 5841 |
| Acceptance | 1/1 completed | 1/1 completed | pending |
| Median input tokens | unknown | unknown | unknown |
| Median cached input tokens | unknown | unknown | unknown |
| Median output tokens | unknown | unknown | unknown |
| Median reasoning output tokens | unknown | unknown | unknown |
| Median input + output tokens | unknown | unknown | unknown |
| Median elapsed seconds | unknown | unknown | unknown |

A provides all 16 files. B provides 11 sufficient files. C provides four files and omits the account model, venue policies, gateway contract, examples, facade, and Angular component/template. The omission list was declared before runs. A successful C result would be an observed inference on this task, not proof that those contracts are dispensable.

| Attempt | Execution | Input | Cached input | Output | Reasoning | Input + output | Process seconds | Correctness | Corrections |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 1 A | completed | 18565 | 0 | 2792 | 1758 | 21357 | 88.31 | pass | 0 |
| 1 B | completed | 16314 | 0 | 2488 | 1402 | 18802 | 84.11 | pass | 0 |
| 1 C | unavailable | unknown | unknown | unknown | unknown | unknown | 13.16 | not measured | 0 |

[Attempt evidence](experiment-003/test-results/2026-10-12-rotating-001/model-trials.json) retains actual failures and exposed usage. The unavailable attempt's process duration is not a successful model latency measurement. Missing usage stays unknown; unexecuted trials have no invented measurements. A service-capacity error is not evidence about context sufficiency. Retry the complete protocol later with a fresh run ID, retaining this partial run.

Whole-run input + output is the sum reported for each run before calculating medians. Cached input and reasoning output are already included and are not added again. These measurements do not isolate context-selection effects or demonstrate general efficiency or monetary savings. Acceptance covers strict TypeScript, both unchanged exported APIs, 21 independent business cases, preview/submission/facade parity, frozen inputs and venue policies, and fresh results. Browser behavior and template compilation remain outside scope.
<!-- experiment-003:end -->
