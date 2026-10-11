"""Generate Experiment 001 fixtures and ready-to-paste prompts without model calls."""
from pathlib import Path
import argparse
import hashlib
import json
from context_pack import normalize_newlines, pack, write_utf8_lf

FILES = {
    "orders.ts": "export interface Order { id: string; price: number; quantity: number; }\nexport function totalValue(orders: readonly Order[]): number {\n  return orders.reduce((total, order) => total + order.price, 0);\n}\n",
    "orders.specification.md": "totalValue returns the sum of price * quantity.\nAn empty list returns zero. Inputs must not be mutated.\nExample: [{id: 'a', price: 12, quantity: 3},\n          {id: 'b', price: 5, quantity: 2}] => 46.\nFractional values are allowed; no rounding is required.\n",
    "theme.ts": "export const theme = { spacing: 8, primary: '#1565c0', radius: 4 };\n",
    "navigation.ts": "export const navigation = ['Overview', 'Orders', 'Settings'];\n",
}
TASK = "Fix totalValue to satisfy the specification. Keep its public API unchanged. Return the patch and a short verification summary.\n\n"


def prepare(destination):
    destination = Path(destination)
    if any((destination / "test-results").glob("*/model-trials.json")):
        raise SystemExit("Refusing to overwrite a recorded experiment; use --destination for a fresh directory")
    fixture = destination / "fixture"
    fixture.mkdir(parents=True, exist_ok=True)
    # Preserve returned model patches; regenerating must not overwrite fixture edits.
    for name, content in FILES.items():
        path = fixture / name
        if path.exists() and normalize_newlines(path.read_bytes().decode("utf-8")) != content:
            raise SystemExit(f"Refusing to overwrite modified fixture: {path}")
    for name, content in FILES.items():
        write_utf8_lf(fixture / name, content)
    metrics = {}
    for condition, names in [("A", list(FILES)), ("B", ["orders.ts", "orders.specification.md"])]:
        prompt = TASK + pack(fixture, names)
        saved = write_utf8_lf(destination / f"prompt-{condition}.md", prompt)
        metrics[condition] = {"characters": len(saved.decode("utf-8")), "bytes": len(saved), "sha256": hashlib.sha256(saved).hexdigest(), "tokens": None}
    metrics["status"] = "context payloads measured; model usage recorded separately"
    write_utf8_lf(destination / "context-metrics.json", json.dumps(metrics, indent=2) + "\n")
    return metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=Path(__file__).parent / "experiment-001")
    metrics = prepare(parser.parse_args().destination)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
