import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from prepare_experiment_002 import prepare, RELEVANT, UNRELATED, ROOT


class LargerExperimentTests(unittest.TestCase):
    def test_saved_prompts_and_manifest_are_exact(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            manifest = prepare(destination)
            self.assertGreater(manifest["conditions"]["A"]["bytes"], manifest["conditions"]["B"]["bytes"])
            self.assertGreater(manifest["conditions"]["B"]["bytes"], 632)
            for condition in ["A", "B"]:
                saved = (destination / f"prompt-{condition}.md").read_bytes()
                self.assertNotIn(b"\r", saved)
                self.assertEqual(len(saved), manifest["conditions"][condition]["bytes"])
                self.assertEqual(hashlib.sha256(saved).hexdigest(), manifest["conditions"][condition]["sha256"])
            self.assertEqual(manifest["conditions"]["B"]["files"], RELEVANT)
            self.assertEqual(set(manifest["conditions"]["A"]["files"]), set(RELEVANT + UNRELATED))

    def test_lf_and_crlf_sources_produce_identical_payloads(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            fixture = base / "fixture"
            shutil.copytree(ROOT / "experiment-002/fixture", fixture)
            prepare(base / "lf", fixture)
            for path in fixture.rglob("*"):
                if path.is_file():
                    path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
            prepare(base / "crlf", fixture)
            for condition in ["A", "B"]:
                self.assertEqual((base / "lf" / f"prompt-{condition}.md").read_bytes(), (base / "crlf" / f"prompt-{condition}.md").read_bytes())
