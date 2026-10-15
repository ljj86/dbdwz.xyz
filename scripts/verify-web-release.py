"""Verify web assets using an owner-provided private deployment baseline."""
from pathlib import Path
import argparse
import hashlib
import json

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', nargs='?', type=Path, default=project / 'dist/build/h5')
parser.add_argument('--manifest', type=Path, default=project / 'release/static-baseline-v054.json')
args = parser.parse_args()
if not args.manifest.is_file():
    parser.exit(2, 'Missing private asset baseline. Supply --manifest from the site owner; '
                  'a public-source build is not a complete production deployment.\n')
try:
    items = json.loads(args.manifest.read_text(encoding='utf-8'))
    if not isinstance(items, list):
        raise ValueError('manifest must be a list')
    errors = []
    root = args.root.resolve()
    for item in items:
        relative = Path(item['path'])
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('manifest paths must be relative')
        target = (root / relative).resolve()
        if not target.is_relative_to(root):
            raise ValueError('manifest target must stay inside root')
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
            errors.append(item['path'])
except (ValueError, KeyError, TypeError, OSError) as error:
    parser.exit(2, f'Invalid or unreadable baseline ({type(error).__name__}).\n')
print(f'Checked {len(items)} original resources; mismatches: {len(errors)}')
for error in errors[:20]:
    print(error)
raise SystemExit(1 if errors else 0)
