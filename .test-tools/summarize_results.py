"""Write observed pilot results without estimating missing usage or monetary costs."""
import json
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "experiment-001/test-results/2026-10-11"
inputs = json.loads((OUT / "input-verification.json").read_text(encoding="utf-8"))
trials = json.loads((OUT / "model-trials.json").read_text(encoding="utf-8"))
acceptance = json.loads((OUT / "acceptance-verification.json").read_text(encoding="utf-8"))
verified = {(run["trial"], run["condition"]): run for run in acceptance["model_runs"]}
summary = {"date": "2026-10-11", "unit_tests": {"passed": 3, "failed": 1, "errors": 1}, "context": inputs["conditions"], "conditions": {}}
for condition in ["A", "B"]:
    runs = [run for run in trials["runs"] if run["condition"] == condition and run["completed"]]
    values = {
        "runs": len(runs),
        "acceptance_passes": sum(verified.get((run["trial"], condition), {}).get("passed", False) for run in runs),
        "median_elapsed_seconds": statistics.median(run["elapsed_seconds"] for run in runs) if runs else None,
    }
    for field in ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]:
        observed = [run["usage"].get(field) for run in runs]
        values[f"median_{field}"] = statistics.median(observed) if observed and all(value is not None for value in observed) else None
    values["median_input_plus_output_tokens"] = statistics.median(run["usage"]["input_tokens"] + run["usage"]["output_tokens"] for run in runs) if runs else None
    summary["conditions"][condition] = values
a, b = (summary["conditions"][condition]["median_input_plus_output_tokens"] for condition in ["A", "B"])
summary["focused_context_median_total_change_percent"] = (b - a) / a * 100 if a and b else None
summary["context_byte_reduction_percent"] = inputs["byte_reduction_percent"]
(OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

lines = [
    "# Results", "", "Observed on 2026-10-11 (Asia/Tehran). Commands ran in the VS Code integrated terminal.", "",
    "Three paired trials used gpt-6.1-sol with xhigh reasoning and Codex CLI 0.160.0. Run order: A/B, B/A, A/B. Each run used a fresh ephemeral session, an empty working directory, disabled shell commands and web search, and zero project-instruction bytes. No repository tool calls or correction turns occurred.", "",
    "## Local verification", "",
    "- Python 3.12.10: 3 existing unit tests passed, 1 failed, and 1 errored.",
    "- The inclusive-range assertion failed because Windows-created fixtures contain CRLF while the expected output contains LF.",
    "- The symlink check errored with WinError 1314: this Windows account cannot create the required symbolic link. The outside-root rejection ran before that error.",
    "- The generator created prompts, reproduced them on a second run, and refused to overwrite a modified fixture.",
    "- Generator byte/hash metrics did not match the files it wrote on Windows. It measures the string before write_text translates newlines. Existing supplied prompts and stored metrics do match.",
    "- Original TypeScript fixture: the example returns 17 instead of 46, and the fractional case returns 1.5 instead of 3. The experiment intentionally contains this bug.", "",
    "## Context and model results", "",
    "| Measurement | A: all four files | B: two relevant files |",
    "| --- | ---: | ---: |",
    f"| Prompt bytes / characters | {inputs['conditions']['A']['bytes']} | {inputs['conditions']['B']['bytes']} |",
]
for label, key in [
    ("Patches passing acceptance", "acceptance_passes"),
    ("Median input tokens", "median_input_tokens"),
    ("Median cached input tokens", "median_cached_input_tokens"),
    ("Median output tokens", "median_output_tokens"),
    ("Median reasoning output tokens", "median_reasoning_output_tokens"),
    ("Median input + output tokens", "median_input_plus_output_tokens"),
    ("Median elapsed seconds", "median_elapsed_seconds"),
]:
    values = [summary["conditions"][condition][key] for condition in ["A", "B"]]
    if key == "acceptance_passes": values = [f"{value}/{summary['conditions'][condition]['runs']}" for value, condition in zip(values, ["A", "B"])]
    if key == "median_elapsed_seconds": values = [f"{value:.2f}" if value is not None else "unknown" for value in values]
    lines.append(f"| {label} | {values[0]} | {values[1]} |")
change = summary["focused_context_median_total_change_percent"]
lines.extend(["", f"Focused context reduced payload bytes by {inputs['byte_reduction']} ({inputs['byte_reduction_percent']:.1f}%). In this pilot, its median reported input + output usage was {abs(change):.1f}% {'higher' if change >= 0 else 'lower'}. All returned patches were checked independently for empty input, the example, fractional multiplication, frozen-input preservation, TypeScript compilation, and unchanged public API.", "",
    "Cached input and reasoning are displayed as reported fields; neither is added again to input + output. These are whole-run CLI usage totals, which do not isolate the pasted fixture's token count. Cache use varied between runs. Three pairs on one tiny synthetic task cannot establish general savings, and monetary cost was not measured.", "",
    "## Every run", "",
    "| Trial | Condition | Input | Cached input | Output | Reasoning output | Input + output | Seconds | Acceptance |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
])
for run in trials["runs"]:
    usage = run.get("usage") or {}
    passed = verified.get((run["trial"], run["condition"]), {}).get("passed", False)
    total = usage.get("input_tokens", 0) + usage.get("output_tokens", 0) if usage else "unknown"
    lines.append(f"| {run['trial']} | {run['condition']} | {usage.get('input_tokens', 'unknown')} | {usage.get('cached_input_tokens', 'unknown')} | {usage.get('output_tokens', 'unknown')} | {usage.get('reasoning_output_tokens', 'unknown')} | {total} | {run['elapsed_seconds']:.2f} | {'pass' if passed else 'fail'} |")
lines.extend(["", "## Evidence and reproduction", "",
    f"Fixture checksum: `{inputs['fixture_sha256']}` (SHA-256 over sorted filename, NUL, raw file bytes, NUL).",
    f"Prompt A SHA-256: `{inputs['conditions']['A']['sha256']}`.",
    f"Prompt B SHA-256: `{inputs['conditions']['B']['sha256']}`.", "",
    "- [Raw trial usage and settings](experiment-001/test-results/2026-10-11/model-trials.json)",
    "- [Independent acceptance checks](experiment-001/test-results/2026-10-11/acceptance-verification.json)",
    "- [Context and generator checks](experiment-001/test-results/2026-10-11/input-verification.json)",
    "- [Unit test output](experiment-001/test-results/2026-10-11/unit-tests.txt)",
    "- [Machine-readable summary](experiment-001/test-results/2026-10-11/summary.json)", "",
    "Individual returned patches and JSONL usage events are retained beside those files. Patched copies are under verification/; the original source and synthetic fixture were preserved.", "",
    "A portable Python interpreter was downloaded from Python.org into .test-tools/python because the system python command is an unusable Windows app alias. No system Python installation was changed.", "",
    "Commands used:", "", "```powershell",
    ".\\.test-tools\\python\\python.exe -B -m unittest -v test_context_pack.py",
    ".\\.test-tools\\python\\python.exe -B .\\.test-tools\\inspect_experiment.py",
    "node .\\.test-tools\\run_model_trials.cjs",
    "node .\\.test-tools\\verify_orders.cjs",
    ".\\.test-tools\\python\\python.exe -B .\\.test-tools\\summarize_results.py", "```", "",
    "CLI JSONL usage fields follow [official OpenAI documentation](https://learn.chatgpt.com/docs/non-interactive-mode).",
])
(ROOT / "RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
