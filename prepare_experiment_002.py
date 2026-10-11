"""Prepare larger, explicit A/B context payloads without running a model."""
import argparse
import hashlib
import json
from pathlib import Path

from context_pack import pack, write_utf8_lf

ROOT = Path(__file__).resolve().parent
RELEVANT = [
    "src/orders/order.model.ts", "src/orders/order-status.ts",
    "src/orders/order-exposure.ts", "src/orders/order-exposure.facade.ts",
    "src/orders/order-exposure.component.ts", "src/orders/order-exposure.component.html",
    "src/orders/order-exposure.examples.ts", "orders.specification.md",
]
UNRELATED = [
    "src/watchlist/watchlist.ts", "src/preferences/preferences.ts",
    "src/notifications/notification-center.ts", "src/portfolio/portfolio.ts",
    "src/navigation/navigation.ts",
]


def prepare(destination, fixture=None):
    destination = Path(destination)
    fixture = Path(fixture or ROOT / "experiment-002/fixture")
    destination.mkdir(parents=True, exist_ok=True)
    task = (ROOT / "experiment-002/task.md").read_text(encoding="utf-8").strip() + "\n\n"
    manifest = {"experiment": "002", "conditions": {}, "fixture_files": {}}
    for condition, names in [("A", RELEVANT + UNRELATED), ("B", RELEVANT)]:
        saved = write_utf8_lf(destination / f"prompt-{condition}.md", task + pack(fixture, names))
        manifest["conditions"][condition] = {"files": names, "bytes": len(saved),
            "characters": len(saved.decode("utf-8")), "sha256": hashlib.sha256(saved).hexdigest(), "tokens": None}
    pieces = []
    for name in sorted(RELEVANT + UNRELATED):
        saved = (fixture / name).read_bytes()
        manifest["fixture_files"][name] = hashlib.sha256(saved).hexdigest()
        pieces.extend([name.encode("utf-8"), b"\0", saved, b"\0"])
    manifest["fixture_sha256"] = hashlib.sha256(b"".join(pieces)).hexdigest()
    protocol = (ROOT / "experiment-002/protocol.json").read_bytes()
    manifest["protocol_sha256"] = hashlib.sha256(protocol).hexdigest()
    write_utf8_lf(destination / "context-metrics.json", json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=ROOT / "experiment-002")
    print(json.dumps(prepare(parser.parse_args().destination), indent=2))
