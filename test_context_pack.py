import tempfile
import unittest
from pathlib import Path
from context_pack import pack


class ContextPackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "orders.ts").write_text("alpha\nbeta\ngamma\n", encoding="utf-8")

    def test_inclusive_range(self):
        self.assertEqual(pack(self.root, ["orders.ts:2:3"]), "### orders.ts:2:3\n\nbeta\ngamma\n")

    def test_duplicate_selection(self):
        self.assertEqual(pack(self.root, ["orders.ts"]), pack(self.root, ["orders.ts", "orders.ts"]))

    def test_rejects_bad_ranges(self):
        for selection in ["orders.ts:0:1", "orders.ts:3:2", "orders.ts:1:9"]:
            with self.subTest(selection=selection), self.assertRaises(ValueError):
                pack(self.root, [selection])

    def test_rejects_escape_and_symlink(self):
        with tempfile.TemporaryDirectory() as outside:
            secret = Path(outside) / "outside.txt"
            secret.write_text("outside", encoding="utf-8")
            with self.assertRaises(ValueError):
                pack(self.root, [str(secret)])
            (self.root / "link.txt").symlink_to(secret)
            with self.assertRaises(ValueError):
                pack(self.root, ["link.txt"])

    def test_rejects_binary(self):
        (self.root / "binary").write_bytes(b"a\x00b")
        with self.assertRaises(ValueError):
            pack(self.root, ["binary"])


if __name__ == "__main__":
    unittest.main()
