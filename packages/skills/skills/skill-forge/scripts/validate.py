#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# ///
"""
Validate a skill folder against the open SKILL.md format.

Usage:
    python3 scripts/validate.py <path-to-skill-folder>
    python3 scripts/validate.py <path-to-skill-folder> --format json
    python3 scripts/validate.py <path-to-skill-folder> --json-out /tmp/skill-report.json
    python3 scripts/validate.py --help

Exit codes:
    0 = pass (warnings allowed)
    1 = fail (at least one error)
    2 = usage error (bad arguments, missing path)

Errors include format and mechanism failures. Warnings include incomplete coverage.
Only run on trusted scripts: scratch copying is not an OS sandbox.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile
from typing import Any


# Errors are spec violations; warnings are quality nudges.
SEVERITY_ERROR = "error"
SEVERITY_WARNING = "warning"

# name: lowercase letters, digits, hyphens. 1-64 chars.
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
NAME_MAX = 64
DESCRIPTION_MAX = 1024
COMPATIBILITY_MAX = 500
BODY_MAX_LINES = 500


class FrontmatterParseError(ValueError):
    """Raised when frontmatter parsing fails."""


# ---------------------------------------------------------------------------
# Frontmatter parsing (stdlib only)
# ---------------------------------------------------------------------------


def _parse_scalar(raw: str) -> Any:
    value = raw.strip()
    if value == "":
        return ""
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False
    if lower in {"null", "none", "~"}:
        return None
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if re.fullmatch(r"-?\d+\.\d+", value):
        return float(value)
    return value


def _collect_block_scalar(
    lines: list[str], start_idx: int, min_indent: int, folded: bool
) -> tuple[str, int]:
    block_lines: list[str] = []
    i = start_idx
    while i < len(lines):
        line = lines[i]
        if line.strip() == "":
            block_lines.append("")
            i += 1
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent < min_indent:
            break
        block_lines.append(line[min_indent:])
        i += 1

    if not folded:
        return ("\n".join(block_lines)).rstrip(), i

    paragraphs: list[str] = []
    current: list[str] = []
    for line in block_lines:
        if line == "":
            if current:
                paragraphs.append(" ".join(current))
                current = []
            paragraphs.append("")
            continue
        current.append(line.strip())
    if current:
        paragraphs.append(" ".join(current))
    return ("\n".join(paragraphs)).rstrip(), i


def _parse_frontmatter_stdlib(frontmatter_raw: str) -> dict[str, Any]:
    """
    Parse a conservative subset of YAML with stdlib only.
    Supports: top-level key:value, one-level nested mapping, block scalars (| and >).
    """
    lines = frontmatter_raw.splitlines()
    data: dict[str, Any] = {}
    i = 0
    top_key_pattern = re.compile(r"^([A-Za-z0-9_-]+)\s*:\s*(.*)$")
    block_markers = {"|", ">", "|-", ">-"}

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped == "" or stripped.startswith("#"):
            i += 1
            continue
        if line.startswith(" "):
            raise FrontmatterParseError(
                f"Unexpected top-level indentation near line {i + 1}: {line}"
            )

        top_match = top_key_pattern.match(line)
        if not top_match:
            raise FrontmatterParseError(
                f"Invalid top-level entry near line {i + 1}: {line}"
            )
        key, raw_value = top_match.group(1), top_match.group(2).strip()

        if raw_value in block_markers:
            folded = raw_value.startswith(">")
            parsed_block, next_idx = _collect_block_scalar(lines, i + 1, min_indent=2, folded=folded)
            data[key] = parsed_block
            i = next_idx
            continue

        if raw_value != "":
            if raw_value.startswith("- "):
                raise FrontmatterParseError(
                    f"List syntax requires PyYAML near line {i + 1}."
                )
            # YAML's plain 'none' is a string for the new enum declarations;
            # retain the legacy scalar parser's null behavior for existing fields.
            data[key] = "none" if key in {"requires", "artifact-owner"} and raw_value == "none" else _parse_scalar(raw_value)
            i += 1
            continue

        # raw_value == "" — possibly nested mapping
        j = i + 1
        while j < len(lines):
            candidate = lines[j]
            if candidate.strip() == "" or candidate.strip().startswith("#"):
                j += 1
                continue
            if not candidate.startswith("  "):
                break
            j += 1

        nested_lines = lines[i + 1 : j]
        if not any(nl.strip() and not nl.strip().startswith("#") for nl in nested_lines):
            data[key] = ""
            i = j
            continue

        nested_data: dict[str, Any] = {}
        k = i + 1
        while k < j:
            nested_line = lines[k]
            ns = nested_line.strip()
            if ns == "" or ns.startswith("#"):
                k += 1
                continue
            if not nested_line.startswith("  "):
                raise FrontmatterParseError(
                    f"Invalid nested indentation near line {k + 1}: {nested_line}"
                )
            content = nested_line[2:]
            if content.startswith(" "):
                raise FrontmatterParseError(
                    f"Deep nesting requires PyYAML near line {k + 1}."
                )
            if content.startswith("- "):
                raise FrontmatterParseError(
                    f"List syntax requires PyYAML near line {k + 1}."
                )
            nested_match = re.match(r"^([^:\s]+)\s*:\s*(.*)$", content)
            if not nested_match:
                raise FrontmatterParseError(
                    f"Invalid nested mapping near line {k + 1}: {nested_line}"
                )
            child_key, child_raw = nested_match.group(1), nested_match.group(2).strip()
            if child_raw in block_markers:
                folded = child_raw.startswith(">")
                child_block, next_k = _collect_block_scalar(
                    lines, k + 1, min_indent=4, folded=folded
                )
                nested_data[child_key] = child_block
                k = next_k
                continue
            nested_data[child_key] = _parse_scalar(child_raw)
            k += 1

        data[key] = nested_data
        i = j

    return data


# ---------------------------------------------------------------------------
# Validation checks
# ---------------------------------------------------------------------------


def _parse_frontmatter(raw: str) -> dict:
    try:
        return _parse_frontmatter_stdlib(raw)
    except FrontmatterParseError:
        # Full YAML remains optional; never install it during validation.
        try:
            import yaml
        except ImportError:
            raise FrontmatterParseError("Unsupported YAML; use the stdlib subset or provide PyYAML")
        parsed = yaml.safe_load(raw)
        if not isinstance(parsed, dict):
            raise FrontmatterParseError("Frontmatter must be a mapping")
        return parsed


def _prose(markdown: str) -> str:
    """Keep command fences; exclude Markdown templates and explicit example fences."""
    lines = []
    fence = None
    example = False
    for line in markdown.splitlines():
        marker = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if marker:
            token, info = marker.groups()
            if fence is None:
                fence = token
                example = info.strip().split()[:1] in (["markdown"], ["md"]) or "example" in info.split()
            elif token[0] == fence[0] and len(token) >= len(fence) and not info.strip():
                fence = None
                example = False
            continue
        if not example:
            lines.append(line)
    return "\n".join(lines)


def _forward_links(root: Path, source: Path, markdown: str):
    prose = _prose(markdown)
    citations = set(re.findall(
        r"(?<![\w/:.-])(?:references|scripts|assets)/[^\s`\"'<>()[\]{}|,;]+", prose
    ))
    # Also check sibling Markdown links used by references, e.g. (spec.md).
    citations.update(re.findall(r"\]\(([^\s)]+)\)", prose))
    for citation in sorted(citations):
        citation = citation.split("#", 1)[0].rstrip(".,:")
        if not citation or re.search(r"[:*?<>${}]", citation) or citation.endswith("/"):
            continue
        if not Path(citation).suffix:
            continue
        base = root if citation.startswith(("references/", "scripts/", "assets/")) else source.parent
        target = (base / citation).resolve()
        try:
            target.relative_to(root)
            inside = True
        except ValueError:
            inside = False
        yield citation, inside and target.is_file()


def _triggers(description: str) -> set:
    positive = re.split(r"(?i)do not use|don't use|not for", description)[0]
    match = re.search(r"(?i)\btriggers?\b\s*(?:\([^)]*\))?\s*:", positive)
    if not match:
        return set()
    section = positive[match.end():]
    phrases = re.findall(r'["“]([^"”]+)["”]|\x27([^\x27]+)\x27', section)
    values = [a or b for a, b in phrases]
    if not values:
        values = re.split(r"[,;\n]", section)
    normalized = set()
    for phrase in values:
        phrase = phrase.strip().rstrip(".").casefold()
        words = re.findall(r"\w+", phrase)
        if phrase.startswith("/") or len(words) >= 2:
            normalized.add("/" + " ".join(words) if phrase.startswith("/") else " ".join(words))
    return normalized


def _catalog_path(root: Path):
    for parent in root.parents:
        path = parent / "catalog" / "v1" / "registry.json"
        if path.is_file():
            return path
    return None


def _exercise_script(root: Path, relative: str, arguments: str, timeout: float):
    """Run trusted scripts from a disposable copy, never from the source folder."""
    runners = {".py": [sys.executable, "-B"], ".sh": [shutil.which("bash")],
               ".js": [shutil.which("node")], ".mjs": [shutil.which("node")],
               ".ts": [shutil.which("bun"), "--no-install", "--no-env-file"]}
    runner = runners.get(Path(relative).suffix)
    if runner is None or not runner[0]:
        return None, "No available runner; script was NOT exercised"
    try:
        args = shlex.split(arguments)
        if any(Path(arg.split("=", 1)[-1]).is_absolute() or ".." in Path(arg.split("=", 1)[-1]).parts for arg in args):
            return False, "Self-test arguments must stay relative to scratch"
        # Do not follow links back into the original skill or repository.
        if any(path.is_symlink() for path in root.rglob("*")):
            return False, "Cannot exercise a skill containing symlinks"
        with tempfile.TemporaryDirectory(prefix="skill-self-test-") as scratch:
            work = Path(scratch) / root.name
            shutil.copytree(str(root), str(work), ignore=shutil.ignore_patterns("__pycache__", ".git"))
            env = {"PATH": os.environ.get("PATH", ""), "HOME": scratch,
                   "TMPDIR": scratch, "TMP": scratch, "TEMP": scratch,
                   "PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1"}
            if "SYSTEMROOT" in os.environ:
                env["SYSTEMROOT"] = os.environ["SYSTEMROOT"]
            with tempfile.TemporaryFile(dir=scratch) as output:
                process = subprocess.Popen(
                    runner + [str(work / relative)] + args, cwd=str(work), env=env,
                    stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
                    start_new_session=(os.name == "posix"),
                )
                timed_out = False
                try:
                    process.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    timed_out = True
                finally:
                    # Kill descendants too, including ones left after the parent exits.
                    if os.name == "posix":
                        try:
                            os.killpg(process.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                    elif process.poll() is None:
                        process.kill()
                    process.wait()
                if timed_out:
                    return False, f"Timed out after {timeout:g}s"
                output.seek(0)
                detail = output.read(4096).decode("utf-8", errors="replace").strip()
                return process.returncode == 0, f"exit {process.returncode}" + (f": {detail}" if detail else "")
    except (OSError, ValueError) as exc:
        return False, str(exc)


def check_skill(skill_path: str, catalog_path=None, script_timeout: float = 10) -> dict:
    if not 0 < script_timeout <= 30:
        raise ValueError("script_timeout must be >0 and <=30")
    results: dict = {
        "path": skill_path,
        "checks": [],
        "passed": 0,
        "failed": 0,
        "warnings": 0,
        "next_steps": [],
    }

    def add(name: str, passed: bool, message: str, severity: str = SEVERITY_ERROR):
        results["checks"].append(
            {"name": name, "passed": passed, "message": message, "severity": severity}
        )
        if passed:
            results["passed"] += 1
        elif severity == SEVERITY_WARNING:
            results["warnings"] += 1
        else:
            results["failed"] += 1

    # 1. Folder exists
    if not os.path.isdir(skill_path):
        add("folder_exists", False, f"Path is not a directory: {skill_path}")
        results["summary"] = "FAIL — folder not found"
        return results
    add("folder_exists", True, "Skill folder exists")

    # 2. Folder name is kebab-case (a-z, 0-9, single hyphens, not at edges)
    folder_name = os.path.basename(os.path.normpath(skill_path))
    is_folder_kebab = bool(NAME_PATTERN.match(folder_name)) and 1 <= len(folder_name) <= NAME_MAX
    add(
        "folder_kebab_case",
        is_folder_kebab,
        f"Folder name '{folder_name}' "
        f"{'is' if is_folder_kebab else 'is NOT'} valid (lowercase a-z, 0-9, single hyphens, {NAME_MAX} chars max).",
    )

    entries = os.listdir(skill_path)

    # 3. SKILL.md exists (exact casing)
    has_skill_md = "SKILL.md" in entries
    add("skill_md_exists", has_skill_md, "SKILL.md exists" if has_skill_md else "SKILL.md not found")
    wrong_casings = [e for e in entries if e.lower() == "skill.md" and e != "SKILL.md"]
    if wrong_casings:
        add(
            "skill_md_casing",
            False,
            f"Wrong casing: '{wrong_casings[0]}' (must be exactly 'SKILL.md').",
        )
    if not has_skill_md:
        results["summary"] = "FAIL — SKILL.md not found"
        return results

    # 4. README.md inside the skill folder (house style, not a spec violation)
    has_readme = any(e.lower() == "readme.md" for e in entries)
    add(
        "readme_in_skill",
        not has_readme,
        "No README.md inside the skill folder" if not has_readme
        else "README.md found inside the skill folder. The SKILL.md format allows extra files, but the convention is to keep human docs outside the skill folder (parent package README). Move it to the parent package and reference it from catalog docs.",
        severity=SEVERITY_WARNING,
    )

    # 5. Parse frontmatter
    skill_md_path = os.path.join(skill_path, "SKILL.md")
    with open(skill_md_path, "r", encoding="utf-8") as f:
        content = f.read()

    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not fm_match:
        add("frontmatter_delimiters", False, "Missing or malformed '---' delimiters")
        results["summary"] = "FAIL — frontmatter parse error"
        return results
    add("frontmatter_delimiters", True, "YAML frontmatter delimiters present")

    try:
        fm = _parse_frontmatter(fm_match.group(1))
        add("frontmatter_valid_yaml", True, "Frontmatter parsed (stdlib subset; install PyYAML for full YAML).")
    except Exception as e:
        add("frontmatter_valid_yaml", False, f"YAML parse error: {e}")
        results["summary"] = "FAIL — YAML parse error"
        return results

    # 6. name field
    name = fm.get("name")
    if not name:
        add("name_present", False, "Missing required 'name' field in frontmatter")
    else:
        name_str = str(name)
        add("name_present", True, f"name: {name_str}")
        is_name_kebab = bool(NAME_PATTERN.match(name_str)) and 1 <= len(name_str) <= NAME_MAX
        add(
            "name_kebab_case",
            is_name_kebab,
            f"name '{name_str}' {'is' if is_name_kebab else 'is NOT'} valid kebab-case.",
        )
        names_match = name_str == folder_name
        add(
            "name_matches_folder",
            names_match,
            f"name '{name_str}' {'matches' if names_match else 'does NOT match'} folder '{folder_name}'.",
            severity=SEVERITY_ERROR,
        )

    # 7. description field
    desc = fm.get("description")
    if not desc:
        add("description_present", False, "Missing required 'description' field in frontmatter")
    else:
        desc_str = str(desc).strip()
        add("description_present", True, f"description present ({len(desc_str)} chars)")
        add(
            "description_length",
            len(desc_str) <= DESCRIPTION_MAX,
            f"Description length: {len(desc_str)}/{DESCRIPTION_MAX} chars",
        )
        has_xml = "<" in desc_str or ">" in desc_str
        add(
            "description_no_xml",
            not has_xml,
            "No XML angle brackets in description" if not has_xml
            else "Description contains XML angle brackets '<>' (forbidden by spec).",
        )
        # Trigger guidance is a quality nudge, not a spec error.
        trigger_keywords = ["use when", "use for", "use this", "when the user", "when you"]
        has_triggers = any(kw in desc_str.lower() for kw in trigger_keywords)
        add(
            "description_has_triggers",
            has_triggers,
            "Description includes trigger guidance ('Use when...')" if has_triggers
            else "Consider adding 'Use when...' trigger guidance to improve agent pickup.",
            severity=SEVERITY_WARNING,
        )

    # 8. license (optional, warning if missing for catalog publishing)
    if "license" not in fm or not fm.get("license"):
        add(
            "license_present",
            False,
            "Missing optional 'license' field. Recommended for published skills (e.g. 'CC-BY-4.0').",
            severity=SEVERITY_WARNING,
        )
    else:
        add("license_present", True, f"license: {fm.get('license')}")

    # 9. compatibility (optional, length check)
    compat = fm.get("compatibility")
    if compat:
        compat_str = str(compat)
        add(
            "compatibility_length",
            len(compat_str) <= COMPATIBILITY_MAX,
            f"compatibility length: {len(compat_str)}/{COMPATIBILITY_MAX} chars",
        )

    # 10. metadata (optional)
    metadata = fm.get("metadata")
    if metadata and isinstance(metadata, dict):
        if "version" not in metadata:
            add(
                "metadata_version",
                False,
                "metadata.version not set (recommended for catalog publishing).",
                severity=SEVERITY_WARNING,
            )
        else:
            add("metadata_version", True, f"metadata.version: {metadata.get('version')}")
    else:
        add(
            "metadata_present",
            False,
            "No metadata block. Recommended: metadata.version and metadata.author.",
            severity=SEVERITY_WARNING,
        )

    # 11. Body content checks
    body = content[fm_match.end():]
    body_line_count = len(body.strip().split("\n"))
    add(
        "body_line_count",
        body_line_count <= BODY_MAX_LINES,
        f"SKILL.md body: {body_line_count} lines "
        f"{'(good)' if body_line_count <= BODY_MAX_LINES else f'(>{BODY_MAX_LINES} — consider moving detail to references/)'}",
        severity=SEVERITY_ERROR if body_line_count > BODY_MAX_LINES else SEVERITY_WARNING,
    )
    has_examples = bool(re.search(r"(?i)(example|user says|trigger phrase|use case)", body))
    add(
        "body_has_examples",
        has_examples,
        "Body includes examples" if has_examples else "Consider adding usage examples.",
        severity=SEVERITY_WARNING,
    )

    # 12. Optional dirs and link integrity
    for dirname in ("references", "scripts", "assets"):
        dir_path = os.path.join(skill_path, dirname)
        if os.path.isdir(dir_path):
            for entry in os.listdir(dir_path):
                ref_token = f"{dirname}/{entry}"
                if entry in body or ref_token in body:
                    add(f"linked:{ref_token}", True, f"{ref_token} is referenced from SKILL.md")
                else:
                    add(
                        f"linked:{ref_token}",
                        False,
                        f"{ref_token} exists but is not referenced from SKILL.md. "
                        f"Either reference it with a clear 'when to load' clause or remove it.",
                        severity=SEVERITY_WARNING,
                    )

    # 13. Forward links in instructions and all reference Markdown (not templates).
    root = Path(skill_path).resolve()
    sources = [(root / "SKILL.md", body)]
    sources.extend((path, path.read_text(encoding="utf-8"))
                   for path in sorted((root / "references").rglob("*.md")))
    for source, markdown in sources:
        for citation, exists in _forward_links(root, source, markdown):
            origin = source.relative_to(root).as_posix()
            add(f"forward_link:{origin}:{citation}", exists,
                f"{origin} cites {citation}: " + ("file exists" if exists else "missing file or path outside skill"))

    # 14. Prerequisite presence is separate from the quality verdict.
    results["prerequisites"] = []
    results["environment_ready"] = None
    requires = fm.get("requires")
    if "requires" not in fm:
        add("requires_declared", False, "Declare requires (command names or 'none'); prerequisite presence is unknown", SEVERITY_WARNING)
    else:
        valid = isinstance(requires, str) and bool(requires.strip()) and all(
            re.fullmatch(r"[A-Za-z0-9_.+-]+", command) for command in requires.split()) and (
                requires == "none" or "none" not in requires.split())
        add("requires_valid", bool(valid), "requires must be a space-separated command string, or 'none'")
        if valid:
            commands = [] if requires == "none" else requires.split()
            for command in commands:
                present = shutil.which(command) is not None
                results["prerequisites"].append({"command": command, "present": present})
                add(f"prerequisite:{command}", present,
                    f"{command}: " + ("present on PATH" if present else "missing on PATH; verdict is not environment-ready"), SEVERITY_WARNING)
            results["environment_ready"] = all(item["present"] for item in results["prerequisites"])

    # 15. Artifact ownership is declared, never inferred from prose.
    owner = fm.get("artifact-owner")
    results["artifact_owner"] = owner
    if "artifact-owner" not in fm:
        add("artifact_owner_declared", False, "Declare artifact-owner: project, tool, or none", SEVERITY_WARNING)
    else:
        add("artifact_owner_valid", isinstance(owner, str) and owner in {"project", "tool", "none"},
            "artifact-owner must be project, tool, or none")

    # 16. Every script gets a bounded executable probe; declared tests go beyond help.
    tests = fm.get("script-tests", {})
    if isinstance(tests, str):
        try:
            tests = json.loads(tests)
        except ValueError:
            tests = None
    valid_tests = isinstance(tests, dict) and all(
        isinstance(key, str) and key.startswith("scripts/") and "\\" not in key and ".." not in Path(key).parts
        and isinstance(value, str) and bool(value.strip()) for key, value in tests.items())
    add("script_tests_valid", valid_tests, "script-tests must map scripts/relative-path to non-empty argument strings")
    scripts = [path for path in sorted((root / "scripts").rglob("*"))
               if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc"]
    script_paths = {path.relative_to(root).as_posix() for path in scripts}
    if valid_tests:
        for relative in tests:
            add(f"script_test_target:{relative}", relative in script_paths,
                f"Declared self-test target {relative}: " + ("exists" if relative in script_paths else "missing script"))
    for path in scripts:
        relative = path.relative_to(root).as_posix()
        declared = valid_tests and relative in tests
        arguments = tests[relative] if declared else "--help"
        add(f"script_test_declared:{relative}", declared,
            "Behavioral self-test declared" if declared else "Only --help smoke-tested; declare script-tests for behavioral coverage", SEVERITY_WARNING)
        passed, message = _exercise_script(root, relative, arguments, script_timeout)
        add(f"script_execution:{relative}", passed is True, f"{arguments}: {message}",
            SEVERITY_WARNING if passed is None else SEVERITY_ERROR)

    # 17. Compare explicit positive triggers with the published catalog, not filenames.
    catalog = Path(catalog_path) if catalog_path is not None else _catalog_path(root)
    if catalog is None:
        add("catalog_available", False, "Published catalog unavailable; collision check not performed (use --catalog)", SEVERITY_WARNING)
    else:
        try:
            published = json.loads(catalog.read_text(encoding="utf-8"))["skills"]
            if not isinstance(published, list):
                raise ValueError("skills must be an array")
            for other in published:
                other_name = other["id"]
                other_desc = other["description"]
                if not isinstance(other_name, str) or not isinstance(other_desc, str):
                    raise ValueError("Catalog skill id and description must be strings")
                if other_name == name:
                    continue
                overlap = _triggers(str(desc or "")) & _triggers(other_desc)
                identical = " ".join(str(desc or "").casefold().split()) == " ".join(other_desc.casefold().split())
                if overlap or identical:
                    detail = ", ".join(sorted(overlap)) if overlap else "identical description"
                    add(f"trigger_collision:{other_name}", False,
                        f"{name} overlaps {other_name}: {detail}", SEVERITY_WARNING)
            add("catalog_available", True, f"Compared against {catalog}")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            add("catalog_available", False, f"Cannot compare published catalog: {exc}", SEVERITY_WARNING)

    # 18. summary
    if results["failed"] == 0:
        results["summary"] = (
            f"PASS — {results['passed']} checks passed"
            + (f", {results['warnings']} warnings" if results["warnings"] else "")
        )
    else:
        results["summary"] = (
            f"FAIL — {results['failed']} errors, {results['warnings']} warnings"
        )

    if results["failed"] > 0:
        results["next_steps"] = [
            f"Fix '{c['name']}': {c['message']}"
            for c in results["checks"]
            if (not c["passed"] and c["severity"] == SEVERITY_ERROR)
        ]

    return results


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def print_report(results: dict, verbose: bool = False) -> None:
    print(f"\n{'=' * 64}")
    print("  Skill Validation Report (open SKILL.md format)")
    print(f"  Path: {results['path']}")
    print(f"{'=' * 64}\n")
    for c in results["checks"]:
        if c["passed"] and not verbose:
            continue
        icon = "✅" if c["passed"] else ("⚠️ " if c["severity"] == SEVERITY_WARNING else "❌")
        print(f"  {icon} {c['name']}: {c['message']}")
    print(f"\n{'-' * 64}")
    print(f"  {results['summary']}")
    print(f"  Passed: {results['passed']} | Failed: {results['failed']} | Warnings: {results['warnings']}")
    print(f"{'-' * 64}\n")
    if results.get("next_steps"):
        print("  Next steps:")
        for i, step in enumerate(results["next_steps"], start=1):
            print(f"    {i}. {step}")
        print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="validate.py",
        description="Validate a skill folder against the open SKILL.md format.",
    )
    parser.add_argument("path", nargs="?", help="Path to the skill folder containing SKILL.md")
    parser.add_argument("--catalog", help="Published registry JSON for trigger comparison (auto-discovered in this catalog)")
    parser.add_argument("--script-timeout", type=float, default=10, help="Per-script timeout in seconds, >0 and <=30 (default: 10)")
    parser.add_argument("--self-test", action="store_true", help="Run bundled good/bad fixture regression tests")
    parser.add_argument(
        "--format",
        choices=["human", "json", "both"],
        default="human",
        help="Output format (default: human).",
    )
    parser.add_argument("--verbose", action="store_true", help="Include passed checks in human output.")
    parser.add_argument("--pretty-json", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument(
        "--json-out",
        metavar="FILE",
        help="Write JSON report to FILE (reusable for downstream agentic checks).",
    )
    args = parser.parse_args(argv)

    if args.self_test:
        import runpy
        suite = Path(__file__).resolve().parent.parent / "assets" / "test_validate.py"
        runpy.run_path(str(suite), run_name="__main__")
        return 0
    if args.path is None:
        parser.error("path is required unless --self-test is used")
    if not 0 < args.script_timeout <= 30:
        parser.error("--script-timeout must be >0 and <=30")
    if not os.path.isdir(args.path):
        print(f"Error: not a directory: {args.path}", file=sys.stderr)
        return 2

    results = check_skill(args.path, catalog_path=args.catalog, script_timeout=args.script_timeout)

    if args.format in {"human", "both"}:
        print_report(results, verbose=args.verbose)
        if not args.json_out:
            print("  Tip: add --json-out FILE to reuse this report without re-running.\n")

    if args.format in {"json", "both"}:
        indent = 2 if args.pretty_json else None
        separators = None if args.pretty_json else (",", ":")
        report_json = json.dumps(results, indent=indent, separators=separators)
        if args.format == "both":
            print("--- JSON Report ---")
        print(report_json)

    if args.json_out:
        indent = 2 if args.pretty_json else None
        separators = None if args.pretty_json else (",", ":")
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=indent, separators=separators)
        if args.format in {"human", "both"}:
            print(f"  JSON report saved to: {args.json_out}")

    return 0 if results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
