import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from prepare_experiment import FILES, prepare


class PrepareExperimentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.destination = Path(self.temporary.name) / "experiment"

    def assert_saved_metrics(self):
        metrics = json.loads((self.destination / "context-metrics.json").read_bytes())
        for condition in ["A", "B"]:
            saved = (self.destination / f"prompt-{condition}.md").read_bytes()
            self.assertNotIn(b"\r", saved)
            self.assertEqual(metrics[condition]["bytes"], len(saved))
            self.assertEqual(metrics[condition]["characters"], len(saved.decode("utf-8")))
            self.assertEqual(metrics[condition]["sha256"], hashlib.sha256(saved).hexdigest())
        for path in self.destination.rglob("*"):
            if path.is_file():
                self.assertNotIn(b"\r", path.read_bytes())
        return metrics

    def test_metrics_match_actual_saved_utf8_lf_bytes(self):
        prepare(self.destination)
        self.assert_saved_metrics()

    def test_unicode_byte_counts_are_not_character_counts(self):
        with patch.dict(FILES, {"translation.ts": "export const greeting = 'سلام';\n"}):
            prepare(self.destination)
            metrics = self.assert_saved_metrics()
            self.assertGreater(metrics["A"]["bytes"], metrics["A"]["characters"])

    def test_accepts_crlf_fixture_and_rewrites_lf(self):
        prepare(self.destination)
        fixture = self.destination / "fixture"
        for name, content in FILES.items():
            (fixture / name).write_bytes(content.replace("\n", "\r\n").encode("utf-8"))
        prepare(self.destination)
        self.assert_saved_metrics()
        for name, content in FILES.items():
            self.assertEqual((fixture / name).read_bytes(), content.encode("utf-8"))

    def test_regeneration_is_byte_identical(self):
        prepare(self.destination)
        before = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        prepare(self.destination)
        after = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        self.assertEqual(before, after)

    def test_modified_fixture_is_rejected_before_any_writes(self):
        prepare(self.destination)
        fixture = self.destination / "fixture"
        (fixture / "orders.ts").write_bytes(FILES["orders.ts"].replace("\n", "\r\n").encode("utf-8"))
        (fixture / "theme.ts").write_bytes(b"// changed fixture\n")
        before = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        with self.assertRaisesRegex(SystemExit, "Refusing to overwrite"):
            prepare(self.destination)
        after = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        self.assertEqual(before, after)

    def test_recorded_experiment_is_not_overwritten(self):
        prepare(self.destination)
        evidence = self.destination / "test-results" / "recorded"
        evidence.mkdir(parents=True)
        (evidence / "model-trials.json").write_bytes(b'{"runs": []}\n')
        before = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        with self.assertRaisesRegex(SystemExit, "recorded experiment"):
            prepare(self.destination)
        after = {path.relative_to(self.destination): path.read_bytes() for path in self.destination.rglob("*") if path.is_file()}
        self.assertEqual(before, after)
