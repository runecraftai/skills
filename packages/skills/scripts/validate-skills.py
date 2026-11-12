#!/usr/bin/env python3
"""Enforce skill-forge over every catalog skill, ratcheting listed legacy errors."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys

PACKAGE = Path(__file__).resolve().parent.parent
FORGE = PACKAGE / "skills" / "skill-forge"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skills-root", type=Path, default=PACKAGE / "skills")
    parser.add_argument("--baseline", type=Path, default=FORGE / "references" / "validation-baseline.json")
    args = parser.parse_args(argv)
    spec = importlib.util.spec_from_file_location("skill_validator", str(FORGE / "scripts" / "validate.py"))
    validator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(validator)
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))["errors"]
    actual = {}
    count = 0
    regressions = []
    for skill in sorted(args.skills_root.iterdir()):
        if not (skill / "SKILL.md").is_file():
            continue
        count += 1
        report = validator.check_skill(str(skill))
        errors = [c["name"] for c in report["checks"] if not c["passed"] and c["severity"] == "error"]
        if errors:
            actual[skill.name] = sorted(errors)
        print(f"{skill.name}: {report['summary']}")
        for check in report["checks"]:
            if not check["passed"] and check["severity"] == "error":
                print(f"  {check['name']}: {check['message']}")
        for error in errors:
            if error not in baseline.get(skill.name, []):
                regressions.append(f"{skill.name}: {error}")
    if count == 0:
        regressions.append("No skills found")
    for skill, errors in baseline.items():
        for error in errors:
            if error not in actual.get(skill, []):
                regressions.append(f"Stale baseline: {skill}: {error} (remove the resolved entry)")
    for regression in regressions:
        print(f"ERROR: {regression}", file=sys.stderr)
    known = sum(1 for skill, errors in actual.items() for error in errors if error in baseline.get(skill, []))
    print(f"Validated {count} skills; {known} listed baseline errors; {len(regressions)} regressions.")
    return 1 if regressions else 0


if __name__ == "__main__":
    sys.exit(main())
