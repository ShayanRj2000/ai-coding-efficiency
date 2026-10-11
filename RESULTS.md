# Results

Observed on 2026-10-11 (Asia/Tehran). Commands ran in the VS Code integrated terminal.

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

Focused context reduced payload bytes by 165 (20.7%). In this pilot, its median reported input + output usage was 34.5% higher. All returned patches were checked independently for empty input, the example, fractional multiplication, frozen-input preservation, TypeScript compilation, and unchanged public API.

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

Commands used:

```powershell
.\.test-tools\python\python.exe -B -m unittest -v test_context_pack.py
.\.test-tools\python\python.exe -B .\.test-tools\inspect_experiment.py
node .\.test-tools\run_model_trials.cjs
node .\.test-tools\verify_orders.cjs
.\.test-tools\python\python.exe -B .\.test-tools\summarize_results.py
```

CLI JSONL usage fields follow [official OpenAI documentation](https://learn.chatgpt.com/docs/non-interactive-mode).
