---
name: bad-skill
description: Use when checking a mechanism fixture. Triggers: "/forge".
license: CC-BY-4.0
requires: python3
artifact-owner: none
script-tests:
  scripts/broken.py: --self-test
  scripts/slow.py: --self-test
metadata:
  version: 1.0.0
---

# Bad fixture

Example: read `references/missing.md` and [the guide](references/guide.md).
Run `scripts/broken.py` and `scripts/slow.py`.
