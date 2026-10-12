import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from prepare_experiment_003 import prepare, CONDITIONS, ROOT

class ThreeConditionTests(unittest.TestCase):
    def test_conditions_and_saved_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            manifest = prepare(destination)
            counts = [manifest["conditions"][c]["bytes"] for c in "ABC"]
            self.assertGreater(counts[0], counts[1])
            self.assertGreater(counts[1], counts[2])
            protocol = json.loads((ROOT / "experiment-003/protocol.json").read_bytes())
            self.assertEqual(set(CONDITIONS["B"]) - set(CONDITIONS["C"]), set(protocol["insufficient_omissions"]))
            for condition in "ABC":
                saved = (destination / f"prompt-{condition}.md").read_bytes()
                self.assertNotIn(b"\r", saved)
                self.assertEqual(len(saved), manifest["conditions"][condition]["bytes"])
                self.assertEqual(hashlib.sha256(saved).hexdigest(), manifest["conditions"][condition]["sha256"])
                self.assertTrue(saved.startswith((ROOT / "experiment-003/task.md").read_bytes().strip()))
    def test_lf_and_crlf_payloads_match(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            fixture = base / "fixture"
            shutil.copytree(ROOT / "experiment-003/fixture", fixture)
            prepare(base / "lf", fixture)
            for source in fixture.rglob("*"):
                if source.is_file():
                    source.write_bytes(source.read_bytes().replace(b"\n", b"\r\n"))
            prepare(base / "crlf", fixture)
            for condition in "ABC":
                self.assertEqual((base / "lf" / f"prompt-{condition}.md").read_bytes(), (base / "crlf" / f"prompt-{condition}.md").read_bytes())
    def test_recorded_run_is_protected(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            prepare(destination)
            evidence = destination / "test-results/recorded"
            evidence.mkdir(parents=True)
            (evidence / "model-trials.json").write_bytes(b"{}\n")
            before = (destination / "prompt-A.md").read_bytes()
            with self.assertRaisesRegex(SystemExit, "immutable"):
                prepare(destination)
            self.assertEqual(before, (destination / "prompt-A.md").read_bytes())
