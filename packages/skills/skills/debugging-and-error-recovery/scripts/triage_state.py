#!/usr/bin/env python3
"""
triage_state.py — deterministic bookkeeping for one active debug session.

Tracks step progress and evidence trail through the 6-phase triage loop:
reproduce → localize → reduce → fix → guard → verify.

Canonical state:  .debug/<session-id>/state.json  (machine-owned — do NOT hand-edit)
Rendered view:    .debug/<session-id>/TRIAGE.md     (regenerated on every write)

Pure standard library. No dependencies. Run from the project root (the dir that
contains .debug/), or pass --root.

Commands:
  start     Begin a new debug session.
  log-step  Record completion of one triage step.
  status    Print current step and evidence trail.
  close     Mark the session resolved.

Exit codes: 0 ok, 2 usage/validation error (e.g. missing grounding).
"""

import argparse
import datetime as _dt
import json
import os
import sys

STEPS = ("reproduce", "localize", "reduce", "fix", "guard", "verify")


def _now():
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _debug_dir(root):
    return os.path.join(root, ".debug")


def _session_dir(root, session_id):
    return os.path.join(_debug_dir(root), session_id)


def _store_path(root, session_id):
    return os.path.join(_session_dir(root, session_id), "state.json")


def _render_path(root, session_id):
    return os.path.join(_session_dir(root, session_id), "TRIAGE.md")


def _load(root, session_id):
    path = _store_path(root, session_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(root, session_id, data):
    os.makedirs(_session_dir(root, session_id), exist_ok=True)
    with open(_store_path(root, session_id), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    _render(root, session_id, data)


def _ground(root, session_id):
    data = _load(root, session_id)
    if data is None:
        print(f"ERROR: no active session '{session_id}'. Run 'start' first.", file=sys.stderr)
        return None
    return data


def _render(root, session_id, data):
    lines = []
    lines.append(f"# Triage Session: {session_id}")
    lines.append("")
    lines.append("> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `triage_state.py` write.")
    lines.append(f"> Canonical state lives in `.debug/{session_id}/state.json`.")
    lines.append("")
    lines.append(f"**Description:** {data['description']}")
    lines.append(f"**Status:** {data['status']}")
    lines.append(f"**Created:** {data.get('created', '—')}")
    if data.get("closed"):
        lines.append(f"**Closed:** {data['closed']}")
    lines.append("")
    lines.append("## Steps")
    lines.append("")
    steps = data.get("steps", [])
    if not steps:
        lines.append("_none_")
        lines.append("")
    else:
        for s in steps:
            lines.append(f"### {s['step']}")
            lines.append(f"- **note:** {s['note']}")
            lines.append(f"- **timestamp:** {s['timestamp']}")
            lines.append("")
    with open(_render_path(root, session_id), "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")


# ----------------------------- commands -----------------------------

def cmd_start(root, args):
    session_id = args.session_id
    if _load(root, session_id) is not None:
        print(f"ERROR: session '{session_id}' already exists. Use 'close' first or pick a different id.", file=sys.stderr)
        return 2
    now = _now()
    data = {
        "session_id": session_id,
        "description": args.description,
        "status": "open",
        "steps": [],
        "created": now,
    }
    _save(root, session_id, data)
    print(f"STARTED session '{session_id}': {args.description}")
    return 0


def cmd_log_step(root, args):
    session_id = args.session_id
    data = _ground(root, session_id)
    if data is None:
        return 2
    if args.step not in STEPS:
        print(f"ERROR: --step must be one of {sorted(STEPS)}", file=sys.stderr)
        return 2
    if not (args.note or "").strip():
        print("ERROR: --note is required (one-line evidence or outcome).", file=sys.stderr)
        return 2
    note = args.note.strip()
    data.setdefault("steps", []).append({
        "step": args.step,
        "note": note,
        "timestamp": _now(),
    })
    _save(root, session_id, data)
    print(f"LOGGED '{args.step}' step in session '{session_id}': {note}")
    return 0


def cmd_status(root, args):
    session_id = args.session_id
    data = _ground(root, session_id)
    if data is None:
        return 2
    steps = data.get("steps", [])
    last = steps[-1]["step"] if steps else "(none)"
    print(f"session: {session_id}")
    print(f"description: {data['description']}")
    print(f"status: {data['status']}")
    print(f"current step: {last}")
    print(f"steps completed: {len(steps)}")
    for s in steps:
        print(f"  {s['step']}: {s['note']}")
    return 0


def cmd_close(root, args):
    session_id = args.session_id
    data = _ground(root, session_id)
    if data is None:
        return 2
    data["status"] = "closed"
    data["closed"] = _now()
    _save(root, session_id, data)
    print(f"CLOSED session '{session_id}'")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(prog="triage_state.py", description="Deterministic debug session bookkeeping.")
    p.add_argument("--root", default=".", help="Project root containing .debug/ (default: current dir)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("start", help="Begin a new debug session")
    sp.add_argument("--session-id", required=True, help="Session identifier")
    sp.add_argument("--description", required=True, help="Short bug description")
    sp.set_defaults(fn=cmd_start)

    sp = sub.add_parser("log-step", help="Record completion of one triage step")
    sp.add_argument("--session-id", required=True, help="Session identifier")
    sp.add_argument("--step", required=True, choices=sorted(STEPS), help="Triage step completed")
    sp.add_argument("--note", required=True, help="One-line evidence or outcome note")
    sp.set_defaults(fn=cmd_log_step)

    sp = sub.add_parser("status", help="Print current step and evidence trail")
    sp.add_argument("--session-id", required=True, help="Session identifier")
    sp.set_defaults(fn=cmd_status)

    sp = sub.add_parser("close", help="Mark the session resolved")
    sp.add_argument("--session-id", required=True, help="Session identifier")
    sp.set_defaults(fn=cmd_close)

    args = p.parse_args(argv)
    root = os.path.abspath(args.root)
    return args.fn(root, args)


if __name__ == "__main__":
    raise SystemExit(main())
