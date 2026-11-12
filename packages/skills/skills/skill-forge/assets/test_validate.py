"""Behavioral regression suite, runnable directly or via validate.py --self-test."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "scripts" / "validate.py"
FIXTURES = ROOT / "assets" / "fixtures"
spec = importlib.util.spec_from_file_location("skill_validator", str(VALIDATOR))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class MechanismTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="forge-regression-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def copy_good(self):
        target = self.root / "good-skill"
        shutil.copytree(str(FIXTURES / "good-skill"), str(target))
        return target

    def check(self, path):
        return validator.check_skill(str(path), FIXTURES / "catalog.json", script_timeout=0.5)

    def errors(self, result):
        return {c["name"] for c in result["checks"] if not c["passed"] and c["severity"] == "error"}

    def cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", str(VALIDATOR)] + list(args),
            capture_output=True, text=True, timeout=15,
        )

    def test_good_fixture_and_source_unchanged(self):
        good = self.copy_good()
        before = {p.relative_to(good): p.read_bytes() for p in good.rglob("*") if p.is_file()}
        result = self.check(good)
        self.assertEqual(self.errors(result), set(), result)
        self.assertTrue(result["environment_ready"])
        self.assertTrue(any(c["name"] == "script_execution:scripts/check.py" and c["passed"] for c in result["checks"]))
        after = {p.relative_to(good): p.read_bytes() for p in good.rglob("*") if p.is_file()}
        self.assertEqual(before, after)

    @unittest.skipUnless(os.name == "posix", "process groups are POSIX-only")
    def test_clean_exit_does_not_signal_a_reaped_process_group(self):
        good = self.copy_good()
        calls = []
        real_killpg = os.killpg

        def record(pid, sig):
            calls.append(pid)
            return real_killpg(pid, sig)

        with mock.patch.object(os, "killpg", record):
            result = self.check(good)
        self.assertEqual(self.errors(result), set(), result)
        self.assertEqual(calls, [])

    @unittest.skipUnless(os.name == "posix", "process groups are POSIX-only")
    def test_timeout_kills_the_unreaped_process_group(self):
        calls = []
        real_killpg = os.killpg

        def record(pid, sig):
            calls.append(sig)
            return real_killpg(pid, sig)

        with mock.patch.object(os, "killpg", record):
            result = self.check(FIXTURES / "bad-skill")
        messages = {c["name"]: c["message"] for c in result["checks"]}
        self.assertEqual(messages["script_execution:scripts/slow.py"], "--self-test: Timed out after 0.5s")
        self.assertEqual(calls, [signal.SIGKILL])

    def test_bad_fixture_names_missing_body_reference_script_and_timeout(self):
        result = self.check(FIXTURES / "bad-skill")
        self.assertEqual(self.errors(result), {
            "forward_link:SKILL.md:references/missing.md",
            "forward_link:references/guide.md:scripts/absent.py",
            "script_execution:scripts/broken.py",
            "script_execution:scripts/slow.py",
        })
        messages = {c["name"]: c["message"] for c in result["checks"]}
        self.assertIn("ImportError: deliberately broken fixture", messages["script_execution:scripts/broken.py"])
        self.assertEqual(messages["script_execution:scripts/slow.py"], "--self-test: Timed out after 0.5s")

    def test_cli_json_exit_codes_and_json_out(self):
        output = self.root / "report.json"
        good = self.cli(str(FIXTURES / "good-skill"), "--format", "json", "--json-out", str(output))
        self.assertEqual(good.returncode, 0, good.stderr)
        self.assertEqual(json.loads(good.stdout), json.loads(output.read_text()))
        bad = self.cli(str(FIXTURES / "bad-skill"), "--format", "json", "--script-timeout", "0.5")
        self.assertEqual(bad.returncode, 1, bad.stderr)
        self.assertEqual(len(self.errors(json.loads(bad.stdout))), 4)

    def test_collision_names_both_skills_and_does_not_fail(self):
        result = self.check(FIXTURES / "good-skill")
        collision = next(c for c in result["checks"] if c["name"] == "trigger_collision:skill-forge")
        self.assertEqual(collision["severity"], "warning")
        self.assertIn("good-skill overlaps skill-forge: /forge", collision["message"])
        self.assertEqual(result["failed"], 0)
        self.assertFalse(any(c["name"] == "trigger_collision:unrelated-fixture" for c in result["checks"]))

    def test_triggering_prose_is_not_mistaken_for_a_trigger_label(self):
        self.assertEqual(
            validator._triggers("Improves triggering accuracy. Lifecycle: DESIGN. EN triggers: /forge, create a skill."),
            {"/forge", "create a skill"},
        )

    def test_negative_triggers_do_not_collide(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace('"/forge"', '"/unique-fixture". Do NOT use for "/forge"'))
        self.assertFalse(any(c["name"].startswith("trigger_collision:") for c in self.check(good)["checks"]))

    def test_missing_and_unknown_prerequisites_are_not_a_ready_environment(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        original = doc.read_text()
        doc.write_text(original.replace("requires: python3", "requires: forge-nonexistent-command-528901"))
        result = self.check(good)
        self.assertFalse(result["environment_ready"])
        self.assertEqual(result["prerequisites"], [{"command": "forge-nonexistent-command-528901", "present": False}])
        self.assertEqual(result["failed"], 0)
        doc.write_text(original.replace("requires: python3\n", "").replace("artifact-owner: none\n", ""))
        result = self.check(good)
        self.assertIsNone(result["environment_ready"])
        self.assertEqual(result["failed"], 0)
        self.assertTrue({"requires_declared", "artifact_owner_declared"} <= {c["name"] for c in result["checks"] if not c["passed"]})

    def test_invalid_declarations_are_errors(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("requires: python3", "requires: true").replace("artifact-owner: none", "artifact-owner: random"))
        self.assertTrue({"requires_valid", "artifact_owner_valid"} <= self.errors(self.check(good)))

    def test_missing_script_test_target_is_error(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("  scripts/check.py: --self-test", "  scripts/missing.py: --self-test"))
        self.assertIn("script_test_target:scripts/missing.py", self.errors(self.check(good)))

    def test_legacy_script_gets_help_probe_and_coverage_warning(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("script-tests:\n  scripts/check.py: --self-test\n", ""))
        result = self.check(good)
        self.assertEqual(result["failed"], 0)
        coverage = next(c for c in result["checks"] if c["name"] == "script_test_declared:scripts/check.py")
        self.assertFalse(coverage["passed"])
        self.assertEqual(coverage["severity"], "warning")

    def test_scratch_home_temp_and_file_relative_writes(self):
        good = self.copy_good()
        (good / "scripts/check.py").write_text(
            "import os\nfrom pathlib import Path\n"
            "Path(__file__).with_name('local-proof').write_text('ok')\n"
            "assert Path.home() == Path(os.environ['TMPDIR'])\n"
            "assert Path.cwd().parent == Path.home()\n"
        )
        self.assertEqual(self.check(good)["failed"], 0)
        self.assertFalse((good / "scripts/local-proof").exists())

    def test_nested_script_executed(self):
        good = self.copy_good()
        nested = good / "scripts/nested"
        nested.mkdir()
        (nested / "broken.py").write_text("raise ImportError('nested failure')\n")
        self.assertIn("script_execution:scripts/nested/broken.py", self.errors(self.check(good)))

    def test_links_check_siblings_and_ignore_fenced_placeholders_and_urls(self):
        good = self.copy_good()
        (good / "references/guide.md").write_text(
            "[sibling](absent.md#heading)\n"
            "[external](https://example.invalid/references/absent.md)\n"
            "```md\nRun scripts/example.py\n```\nUse `scripts/*.py` as a glob.\n"
        )
        self.assertEqual(self.errors(self.check(good)), {"forward_link:references/guide.md:absent.md"})

    def test_command_fences_are_checked_unless_explicit_examples(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text() + "\n```bash\npython3 scripts/command-missing.py\n```\n"
                       + "\n```bash example\npython3 scripts/hypothetical.py\n```\n")
        self.assertEqual(self.errors(self.check(good)), {"forward_link:SKILL.md:scripts/command-missing.py"})

    @unittest.skipUnless(os.name == "posix", "POSIX symlink isolation")
    def test_symlink_execution_refused(self):
        good = self.copy_good()
        (good / "assets").mkdir()
        (good / "assets/outside").symlink_to(self.root)
        self.assertIn("script_execution:scripts/check.py", self.errors(self.check(good)))

    def test_catalog_missing_is_an_explicit_warning(self):
        result = validator.check_skill(str(FIXTURES / "good-skill"), self.root / "missing.json")
        check = next(c for c in result["checks"] if c["name"] == "catalog_available")
        self.assertFalse(check["passed"])
        self.assertEqual(check["severity"], "warning")
        self.assertEqual(result["failed"], 0)

    def test_stdlib_parser_supports_new_fields_without_yaml(self):
        parsed = validator._parse_frontmatter_stdlib(
            "requires: python3 git\nartifact-owner: project\nscript-tests:\n  scripts/check.py: --self-test\n"
        )
        self.assertEqual(parsed["script-tests"], {"scripts/check.py": "--self-test"})
        self.assertEqual(parsed["requires"], "python3 git")

    def test_json_scalar_script_tests_are_catalog_compatible(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("script-tests:\n  scripts/check.py: --self-test",
                       "script-tests: '" + json.dumps({"scripts/check.py": "--self-test"}) + "'"))
        self.assertEqual(self.check(good)["failed"], 0)
        doc.write_text(doc.read_text().replace("script-tests: '{", "script-tests: 'invalid{"))
        self.assertIn("script_tests_valid", self.errors(self.check(good)))

    def test_requires_none_and_invalid_mixed_none(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        original = doc.read_text()
        doc.write_text(original.replace("requires: python3", "requires: none"))
        result = self.check(good)
        self.assertTrue(result["environment_ready"])
        self.assertEqual(result["prerequisites"], [])
        doc.write_text(original.replace("requires: python3", "requires: none python3"))
        self.assertIn("requires_valid", self.errors(self.check(good)))

    def test_parent_relative_test_arguments_are_refused(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("scripts/check.py: --self-test", "scripts/check.py: --root=../../outside"))
        self.assertIn("script_execution:scripts/check.py", self.errors(self.check(good)))
        self.assertFalse((self.root.parent / "outside").exists())

    def test_cli_rejects_unbounded_timeout(self):
        for value in ("0", "-1", "31", "nan", "inf"):
            result = self.cli(str(FIXTURES / "good-skill"), "--script-timeout", value)
            self.assertEqual(result.returncode, 2, value)

    def test_existing_format_errors_still_fail(self):
        good = self.copy_good()
        doc = good / "SKILL.md"
        doc.write_text(doc.read_text().replace("name: good-skill", "name: Invalid--Name").replace(
            "description: Use when checking a mechanism fixture.", "description: <invalid> Use when checking a mechanism fixture."))
        self.assertTrue({"name_kebab_case", "name_matches_folder", "description_no_xml"} <= self.errors(self.check(good)))


if __name__ == "__main__":
    unittest.main(argv=[str(Path(__file__))], verbosity=2)
