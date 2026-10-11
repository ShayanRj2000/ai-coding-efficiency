"""Measure the existing experiment and exercise its generator in a disposable copy."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from context_pack import pack
from prepare_experiment import FILES, TASK

OUT = ROOT / "experiment-001" / "test-results" / "2026-10-11"
if (OUT / "input-verification.json").exists():
    raise SystemExit("Experiment 001 evidence is immutable. Run the portable unit tests instead.")
OUT.mkdir(parents=True, exist_ok=True)
stored = json.loads((ROOT / "experiment-001/context-metrics.json").read_text(encoding="utf-8"))
result = {"python": sys.version, "date": "2026-10-11", "conditions": {}, "generator_checks": {}}
fixture = ROOT / "experiment-001/fixture"
result["fixture_sha256"] = hashlib.sha256(b"".join(name.encode() + b"\0" + (fixture / name).read_bytes() + b"\0" for name in sorted(FILES))).hexdigest()
for condition, names in [("A", list(FILES)), ("B", ["orders.ts", "orders.specification.md"])]:
    payload = (TASK + pack(fixture, names)).encode("utf-8")
    (OUT / f"prompt-{condition}.md").write_bytes(payload)
    saved = (ROOT / f"experiment-001/prompt-{condition}.md").read_bytes()
    result["conditions"][condition] = {
        "characters": len(payload.decode("utf-8")), "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(), "tokens": None,
        "existing_prompt_bytes": len(saved),
        "existing_prompt_sha256": hashlib.sha256(saved).hexdigest(),
        "stored_metrics_match_existing_bytes": stored[condition]["bytes"] == len(saved),
        "stored_hash_matches_existing_bytes": stored[condition]["sha256"] == hashlib.sha256(saved).hexdigest(),
    }
a, b = (result["conditions"][c]["bytes"] for c in ["A", "B"])
result["byte_reduction"] = a - b
result["byte_reduction_percent"] = (a - b) / a * 100
with tempfile.TemporaryDirectory(dir=ROOT / ".test-tools") as directory:
    temporary = Path(directory)
    for filename in ["context_pack.py", "prepare_experiment.py"]:
        shutil.copyfile(ROOT / filename, temporary / filename)
    command = [sys.executable, "-B", str(temporary / "prepare_experiment.py")]
    first = subprocess.run(command, capture_output=True, text=True)
    generated = temporary / "experiment-001"
    before = {p.name: p.read_bytes() for p in generated.glob("prompt-*.md")}
    second = subprocess.run(command, capture_output=True, text=True)
    result["generator_checks"]["generation_succeeds"] = first.returncode == 0
    result["generator_checks"]["regeneration_is_identical"] = second.returncode == 0 and before == {p.name: p.read_bytes() for p in generated.glob("prompt-*.md")}
    metrics = json.loads((generated / "context-metrics.json").read_text(encoding="utf-8"))
    result["generator_checks"]["metrics_match_written_payloads"] = all(metrics[c]["bytes"] == len((generated / f"prompt-{c}.md").read_bytes()) and metrics[c]["sha256"] == hashlib.sha256((generated / f"prompt-{c}.md").read_bytes()).hexdigest() for c in ["A", "B"])
    changed = generated / "fixture/orders.ts"
    changed.write_text("// deliberately modified fixture\n", encoding="utf-8")
    modified_bytes = changed.read_bytes()
    guarded = subprocess.run(command, capture_output=True, text=True)
    result["generator_checks"]["modified_fixture_is_protected"] = guarded.returncode != 0 and "Refusing to overwrite" in guarded.stderr and changed.read_bytes() == modified_bytes
(OUT / "input-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
