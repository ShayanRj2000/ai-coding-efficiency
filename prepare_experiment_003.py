"""Prepare three contexts for the predeclared multi-file ticket experiment."""
import argparse
import hashlib
import json
from pathlib import Path
from context_pack import pack, write_utf8_lf

ROOT = Path(__file__).resolve().parent
CORE = ["src/tickets/build-ticket-request.ts", "src/tickets/present-ticket.ts",
        "src/tickets/ticket.model.ts", "ticket.specification.md"]
DEPENDENCIES = ["src/accounts/account.model.ts", "src/venues/venue-policies.ts",
                "src/contracts/wire-contract.md", "src/tickets/ticket.examples.ts",
                "src/tickets/ticket.facade.ts", "src/tickets/ticket.component.ts",
                "src/tickets/ticket.component.html"]
UNRELATED = ["src/watchlist/watchlist.ts", "src/preferences/preferences.ts",
             "src/notifications/notification-center.ts", "src/portfolio/portfolio.ts", "src/navigation/navigation.ts"]
CONDITIONS = {"A": CORE + DEPENDENCIES + UNRELATED, "B": CORE + DEPENDENCIES, "C": CORE}

def prepare(destination, fixture=None):
    destination = Path(destination)
    if any((destination / "test-results").glob("*/model-trials.json")):
        raise SystemExit("Recorded experiment is immutable; use a fresh --destination")
    fixture = Path(fixture or ROOT / "experiment-003/fixture")
    destination.mkdir(parents=True, exist_ok=True)
    task = (ROOT / "experiment-003/task.md").read_text(encoding="utf-8").strip() + "\n\n"
    manifest = {"experiment": "003", "conditions": {}, "fixture_files": {}}
    for condition, names in CONDITIONS.items():
        saved = write_utf8_lf(destination / f"prompt-{condition}.md", task + pack(fixture, names))
        manifest["conditions"][condition] = {"files": names, "bytes": len(saved), "characters": len(saved.decode("utf-8")), "sha256": hashlib.sha256(saved).hexdigest(), "tokens": None}
    pieces = []
    for name in sorted(CONDITIONS["A"]):
        saved = (fixture / name).read_bytes()
        manifest["fixture_files"][name] = hashlib.sha256(saved).hexdigest()
        pieces.extend([name.encode(), b"\0", saved, b"\0"])
    manifest["fixture_sha256"] = hashlib.sha256(b"".join(pieces)).hexdigest()
    manifest["protocol_sha256"] = hashlib.sha256((ROOT / "experiment-003/protocol.json").read_bytes()).hexdigest()
    write_utf8_lf(destination / "context-metrics.json", json.dumps(manifest, indent=2) + "\n")
    return manifest

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=ROOT / "experiment-003")
    print(json.dumps(prepare(parser.parse_args().destination), indent=2))
