import tempfile
import errno
import os
import subprocess
import sys
import unittest
from pathlib import Path
from context_pack import pack


class ContextPackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "orders.ts").write_bytes(b"alpha\nbeta\ngamma\n")

    def test_lf_and_crlf_inputs_produce_identical_context(self):
        for ending in [b"\n", b"\r\n", b"\r"]:
            with self.subTest(ending=ending):
                (self.root / "orders.ts").write_bytes(ending.join([b"alpha", b"beta", b"gamma", b""]))
                self.assertEqual(pack(self.root, ["orders.ts"]), "### orders.ts\n\nalpha\nbeta\ngamma\n")
                self.assertEqual(pack(self.root, ["orders.ts:2:3"]), "### orders.ts:2:3\n\nbeta\ngamma\n")

    def test_inclusive_range(self):
        self.assertEqual(pack(self.root, ["orders.ts:2:3"]), "### orders.ts:2:3\n\nbeta\ngamma\n")

    def test_duplicate_selection(self):
        self.assertEqual(pack(self.root, ["orders.ts"]), pack(self.root, ["orders.ts", "orders.ts"]))

    def test_rejects_bad_ranges(self):
        for selection in ["orders.ts:0:1", "orders.ts:3:2", "orders.ts:1:9"]:
            with self.subTest(selection=selection), self.assertRaises(ValueError):
                pack(self.root, [selection])

    def test_rejects_absolute_outside_root(self):
        with tempfile.TemporaryDirectory() as outside:
            secret = Path(outside) / "outside.txt"
            secret.write_text("outside", encoding="utf-8")
            with self.assertRaises(ValueError):
                pack(self.root, [str(secret)])

    def test_rejects_relative_outside_root(self):
        with tempfile.TemporaryDirectory() as outside:
            secret = Path(outside) / "outside.txt"
            secret.write_bytes(b"outside")
            with self.assertRaises(ValueError):
                pack(self.root, [os.path.relpath(secret, self.root)])

    def test_rejects_symlink_outside_root(self):
        with tempfile.TemporaryDirectory() as outside:
            secret = Path(outside) / "outside.txt"
            secret.write_bytes(b"outside")
            try:
                (self.root / "link.txt").symlink_to(secret)
            except NotImplementedError as error:
                self.skipTest(f"Symlinks are unsupported: {error}")
            except OSError as error:
                if error.errno in {errno.EACCES, errno.EPERM, errno.ENOSYS, errno.ENOTSUP} or getattr(error, "winerror", None) in {50, 1314}:
                    self.skipTest(f"Symlink support or permission unavailable: {error}")
                raise
            with self.assertRaises(ValueError):
                pack(self.root, ["link.txt"])

    def test_cli_saves_utf8_lf_and_reports_actual_bytes(self):
        (self.root / "orders.ts").write_bytes("سلام\r\nsecond\r\n".encode("utf-8"))
        output = self.root / "context.md"
        command = [sys.executable, "-B", str(Path(__file__).with_name("context_pack.py")), "--root", str(self.root), "--output", str(output), "orders.ts"]
        result = subprocess.run(command, capture_output=True, check=True)
        saved = output.read_bytes()
        self.assertNotIn(b"\r", saved)
        self.assertEqual(result.stdout, b"")
        self.assertIn(f"{len(saved.decode('utf-8'))} characters, {len(saved)} bytes".encode(), result.stderr)

    def test_cli_stdout_has_lf_bytes(self):
        (self.root / "orders.ts").write_bytes(b"alpha\r\nbeta\r\n")
        result = subprocess.run([sys.executable, "-B", str(Path(__file__).with_name("context_pack.py")), "--root", str(self.root), "orders.ts"], capture_output=True, check=True)
        self.assertEqual(result.stdout, b"### orders.ts\n\nalpha\nbeta\n")

    def test_rejects_binary(self):
        (self.root / "binary").write_bytes(b"a\x00b")
        with self.assertRaises(ValueError):
            pack(self.root, ["binary"])


if __name__ == "__main__":
    unittest.main()
