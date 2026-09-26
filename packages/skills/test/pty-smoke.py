import fcntl
import os
import pty
import re
import select
import signal
import struct
import subprocess
import sys
import termios
import time

command = sys.argv[1:]
if not command:
    raise SystemExit("usage: pty-smoke.py <grimoire executable and args...>")

def interactive(exit_key):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    before = termios.tcgetattr(slave)
    proc = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    os.close(slave)
    output = b""
    try:
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline and b"Space select" not in re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", output):
            ready, _, _ = select.select([master], [], [], 0.2)
            if ready:
                try:
                    output += os.read(master, 65536)
                except OSError:
                    break
        if b"Space select" not in re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", output):
            raise RuntimeError("TUI did not render before timeout: " + re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", output)[-500:].decode(errors="replace"))
        time.sleep(0.5)
        if exit_key == "resize":
            fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 12, 32, 0, 0))
            os.killpg(proc.pid, signal.SIGWINCH)
            time.sleep(0.2)
            exit_key = "q"
        os.write(master, b"\x03" if exit_key == "ctrl-c" else b"q")
        deadline = time.monotonic() + 8
        while proc.poll() is None and time.monotonic() < deadline:
            ready, _, _ = select.select([master], [], [], 0.2)
            if ready:
                try: output += os.read(master, 65536)
                except OSError: break
        code = proc.poll()
        if code is None:
            os.killpg(proc.pid, signal.SIGKILL)
            raise RuntimeError(f"TUI did not exit after {exit_key}: " + re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", output)[-500:].decode(errors="replace"))
        if code not in (0, 130):
            raise RuntimeError(f"TUI exited {code}: " + output[-500:].decode(errors="replace"))
        if termios.tcgetattr(master) != before:
            raise RuntimeError("terminal mode was not restored")
        try:
            os.killpg(proc.pid, 0)
        except ProcessLookupError:
            pass
        else:
            raise RuntimeError("TUI left a child process group running")
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait(timeout=3)
        os.close(master)

if os.environ.get("GRIMOIRE_EXPECT_NATIVE_ERROR"):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    before = termios.tcgetattr(slave)
    proc = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    os.close(slave)
    output = b""
    try:
        deadline = time.monotonic() + 12
        while proc.poll() is None and time.monotonic() < deadline:
            ready, _, _ = select.select([master], [], [], 0.2)
            if ready:
                try: output += os.read(master, 65536)
                except OSError: break
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGKILL)
            raise RuntimeError("missing-native diagnostic did not exit")
        output += b""
        clean = re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", output)
        if proc.returncode != 1 or b"OpenTUI could not start" not in clean:
            raise RuntimeError("missing-native diagnostic was not actionable: " + clean[-500:].decode(errors="replace"))
        if termios.tcgetattr(master) != before:
            raise RuntimeError("terminal mode was not restored after renderer failure")
    finally:
        if proc.poll() is None: os.killpg(proc.pid, signal.SIGKILL); proc.wait(timeout=3)
        os.close(master)
else:
    for mode in ("q", "ctrl-c", "resize"):
        interactive(mode)

refused = subprocess.run(command, input=b"", stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=8)
if refused.returncode != 1 or refused.stdout or len(refused.stderr.splitlines()) != 1:
    raise RuntimeError(f"non-TTY refusal contract failed: {refused.returncode}, {refused.stdout!r}, {refused.stderr!r}")
for missing in ("stdin", "stdout"):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    kwargs = {"stdin": subprocess.PIPE if missing == "stdin" else slave, "stdout": subprocess.PIPE if missing == "stdout" else slave, "stderr": subprocess.PIPE}
    partial = subprocess.Popen(command, **kwargs)
    os.close(slave)
    stdout, stderr = partial.communicate(input=b"" if missing == "stdin" else None, timeout=8)
    os.close(master)
    if partial.returncode != 1 or (stdout if missing == "stdout" else b"") or len(stderr.splitlines()) != 1:
        raise RuntimeError(f"partial-TTY refusal failed for {missing}: {partial.returncode}, {stdout!r}, {stderr!r}")
