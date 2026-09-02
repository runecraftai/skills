#!/usr/bin/env python3
"""
migration_tracker.py — deterministic per-consumer migration tracking.

Tracks migration status for a single deprecation effort (identified by --slug).
Canonical state lives in .migrations/<slug>/state.json; a human-readable
STATUS.md is regenerated on every write.

Pure standard library. No dependencies. Run from the project root (the dir
that contains .migrations), or pass --root.

Commands:
  add-consumer    Register a consumer with a migration status.
  mark-migrated   Flip a consumer to migrated with an evidence note.
  status          Print aggregate counts (total, pending, migrating, done).
  list-pending    Print consumers not yet migrated.

Exit codes: 0 ok, 2 usage/validation error.
"""

import argparse
import datetime as _dt
import json
import os
import sys

MIGRATIONS_DIR = ".migrations"

VALID_STATUSES = {"pending", "migrating", "done"}


def _now():
	return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _store_path(root, slug):
	return os.path.join(root, MIGRATIONS_DIR, slug, "state.json")


def _render_path(root, slug):
	return os.path.join(root, MIGRATIONS_DIR, slug, "STATUS.md")


def _slug_dir(root, slug):
	return os.path.join(root, MIGRATIONS_DIR, slug)


def _load(root, slug):
	path = _store_path(root, slug)
	if not os.path.exists(path):
		return {"slug": slug, "consumers": []}
	with open(path, "r", encoding="utf-8") as f:
		data = json.load(f)
	data.setdefault("slug", slug)
	data.setdefault("consumers", [])
	return data


def _save(root, slug, data):
	os.makedirs(_slug_dir(root, slug), exist_ok=True)
	with open(_store_path(root, slug), "w", encoding="utf-8") as f:
		json.dump(data, f, indent=2, ensure_ascii=False)
		f.write("\n")
	_render(root, slug, data)


def _find_consumer(data, name):
	for c in data["consumers"]:
		if c["name"] == name:
			return c
	return None


def _render(root, slug, data):
	consumers = data["consumers"]
	total = len(consumers)
	pending = sum(1 for c in consumers if c["status"] == "pending")
	migrating = sum(1 for c in consumers if c["status"] == "migrating")
	done = sum(1 for c in consumers if c["status"] == "done")

	lines = []
	lines.append(f"# Migration Status: `{slug}`")
	lines.append("")
	lines.append("> Auto-maintained by `scripts/migration_tracker.py`. Do NOT hand-edit.")
	lines.append(f"> Canonical state lives in `.migrations/{slug}/state.json`.")
	lines.append("")
	lines.append("## Summary")
	lines.append("")
	lines.append("| Metric | Count |")
	lines.append("| ------ | ----- |")
	lines.append(f"| Total  | {total} |")
	lines.append(f"| Pending | {pending} |")
	lines.append(f"| Migrating | {migrating} |")
	lines.append(f"| Done | {done} |")
	lines.append("")

	if not consumers:
		lines.append("_(no consumers registered)_")
		lines.append("")
	else:
		lines.append("## Consumers")
		lines.append("")
		lines.append("| Consumer | Status | Evidence | Last Updated |")
		lines.append("| -------- | ------ | -------- | ------------ |")
		for c in sorted(consumers, key=lambda x: x.get("created", "")):
			evidence = c.get("evidence_note") or "\u2014"
			updated = c.get("updated", c.get("created", "\u2014"))
			lines.append(f"| {c['name']} | {c['status']} | {evidence} | {updated} |")
		lines.append("")

	with open(_render_path(root, slug), "w", encoding="utf-8") as f:
		f.write("\n".join(lines).rstrip() + "\n")


# ----------------------------- commands -----------------------------


def cmd_add_consumer(root, args):
	slug = args.slug
	consumer_name = args.consumer
	status = args.status

	data = _load(root, slug)
	existing = _find_consumer(data, consumer_name)
	now = _now()

	if existing:
		existing["status"] = status
		existing["updated"] = now
		_save(root, slug, data)
		print(f"UPDATED {consumer_name} -> {status}")
	else:
		data["consumers"].append({
			"name": consumer_name,
			"status": status,
			"evidence_note": None,
			"created": now,
			"updated": now,
		})
		_save(root, slug, data)
		print(f"ADDED {consumer_name} -> {status}")
	return 0


def cmd_mark_migrated(root, args):
	slug = args.slug
	consumer_name = args.consumer
	note = (args.note or "").strip()

	data = _load(root, slug)
	existing = _find_consumer(data, consumer_name)

	if not existing:
		print(f"ERROR: consumer '{consumer_name}' not registered for slug '{slug}'. Use add-consumer first.", file=sys.stderr)
		return 2

	now = _now()
	existing["status"] = "done"
	existing["evidence_note"] = note if note else None
	existing["updated"] = now
	_save(root, slug, data)
	print(f"MIGRATED {consumer_name} ({note if note else 'no note'})")
	return 0


def cmd_status(root, args):
	slug = args.slug
	data = _load(root, slug)
	consumers = data["consumers"]

	if not consumers:
		print("(no consumers registered)")
		return 0

	total = len(consumers)
	pending = sum(1 for c in consumers if c["status"] == "pending")
	migrating = sum(1 for c in consumers if c["status"] == "migrating")
	done = sum(1 for c in consumers if c["status"] == "done")

	print(f"{slug}: {total} total | pending={pending} migrating={migrating} done={done}")
	return 0


def cmd_list_pending(root, args):
	slug = args.slug
	data = _load(root, slug)

	if not data["consumers"]:
		print("(no consumers registered)")
		return 0

	pending = [c for c in data["consumers"] if c["status"] in ("pending", "migrating")]

	if not pending:
		print("(no pending consumers)")
		return 0

	for c in sorted(pending, key=lambda x: x.get("created", "")):
		print(f"{c['name']} ({c['status']})")
	return 0


def main(argv=None):
	p = argparse.ArgumentParser(
		prog="migration_tracker.py",
		description="Deterministic per-consumer migration tracking.",
	)
	p.add_argument("--root", default=".", help="Project root containing .migrations/ (default: current dir)")
	sub = p.add_subparsers(dest="cmd", required=True)

	sp = sub.add_parser("add-consumer", help="Register a consumer with a migration status")
	sp.add_argument("--slug", required=True, help="Migration effort slug")
	sp.add_argument("--consumer", required=True, help="Consumer name")
	sp.add_argument("--status", required=True, choices=sorted(VALID_STATUSES), help="Migration status")
	sp.set_defaults(fn=cmd_add_consumer)

	sp = sub.add_parser("mark-migrated", help="Flip a consumer to migrated with an evidence note")
	sp.add_argument("--slug", required=True, help="Migration effort slug")
	sp.add_argument("--consumer", required=True, help="Consumer name")
	sp.add_argument("--note", required=True, help="Evidence note for the migration")
	sp.set_defaults(fn=cmd_mark_migrated)

	sp = sub.add_parser("status", help="Print aggregate counts")
	sp.add_argument("--slug", required=True, help="Migration effort slug")
	sp.set_defaults(fn=cmd_status)

	sp = sub.add_parser("list-pending", help="Print consumers not yet migrated")
	sp.add_argument("--slug", required=True, help="Migration effort slug")
	sp.set_defaults(fn=cmd_list_pending)

	args = p.parse_args(argv)
	root = os.path.abspath(args.root)
	return args.fn(root, args)


if __name__ == "__main__":
	raise SystemExit(main())
