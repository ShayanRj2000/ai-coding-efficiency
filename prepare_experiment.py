"""Generate Experiment 001 fixtures and ready-to-paste prompts without model calls."""
from pathlib import Path
import hashlib
import json
from context_pack import pack

FILES = {
    "orders.ts": "export interface Order { id: string; price: number; quantity: number; }\nexport function totalValue(orders: readonly Order[]): number {\n  return orders.reduce((total, order) => total + order.price, 0);\n}\n",
    "orders.specification.md": "totalValue returns the sum of price * quantity.\nAn empty list returns zero. Inputs must not be mutated.\nExample: [{id: 'a', price: 12, quantity: 3},\n          {id: 'b', price: 5, quantity: 2}] => 46.\nFractional values are allowed; no rounding is required.\n",
    "theme.ts": "export const theme = { spacing: 8, primary: '#1565c0', radius: 4 };\n",
    "navigation.ts": "export const navigation = ['Overview', 'Orders', 'Settings'];\n",
}
TASK = "Fix totalValue to satisfy the specification. Keep its public API unchanged. Return the patch and a short verification summary.\n\n"


def main():
    destination = Path(__file__).parent / "experiment-001"
    fixture = destination / "fixture"
    fixture.mkdir(parents=True, exist_ok=True)
    # Preserve returned model patches; regenerating must not overwrite fixture edits.
    for name, content in FILES.items():
        path = fixture / name
        if path.exists() and path.read_text(encoding="utf-8") != content:
            raise SystemExit(f"Refusing to overwrite modified fixture: {path}")
        path.write_text(content, encoding="utf-8")
    metrics = {}
    for condition, names in [("A", list(FILES)), ("B", ["orders.ts", "orders.specification.md"])]:
        prompt = TASK + pack(fixture, names)
        (destination / f"prompt-{condition}.md").write_text(prompt, encoding="utf-8")
        metrics[condition] = {"characters": len(prompt), "bytes": len(prompt.encode("utf-8")), "sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(), "tokens": None}
    metrics["status"] = "context payloads measured; no model trials"
    (destination / "context-metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
