"""Pack explicit UTF-8 files/ranges. Byte counts are not token estimates."""
import argparse
from pathlib import Path
import re
import sys


def pack(root, selections):
    root = Path(root).resolve(strict=True)
    sections = []
    seen = set()
    for selection in selections:
        match = re.fullmatch(r"(.+):(\d+):(\d+)", selection)
        name = match.group(1) if match else selection
        path = (root / name).resolve(strict=True)
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError("Selection must be a file inside the root")
        content = path.read_bytes().decode("utf-8")
        if "\x00" in content:
            raise ValueError("Binary content is not supported")
        label = path.relative_to(root).as_posix()
        if match:
            start, end = int(match.group(2)), int(match.group(3))
            lines = content.splitlines(keepends=True)
            if not 1 <= start <= end <= len(lines):
                raise ValueError("Line range is outside the file")
            content = "".join(lines[start - 1:end])
            label += f":{start}:{end}"
        if label in seen:
            continue
        seen.add(label)
        sections.append(f"### {label}\n\n{content.rstrip()}\n")
    return "\n".join(sections)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("selections", nargs="+", help="relative file or file:start:end")
    args = parser.parse_args()
    try:
        output = pack(args.root, args.selections)
    except (OSError, ValueError, UnicodeError) as error:
        parser.exit(2, f"Error: {error}\n")
    sys.stdout.write(output)
    print(f"Context: {len(output)} characters, {len(output.encode('utf-8'))} bytes; tokens unknown", file=sys.stderr)


if __name__ == "__main__":
    main()
