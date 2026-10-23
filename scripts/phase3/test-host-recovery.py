#!/usr/bin/env python3
"""Exercise the real host entry point without requiring GTK or a display."""
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile
import time
import unittest

HOST = Path(__file__).resolve().parents[2] / "image/includes/usr/local/bin/rocket-shell-host"


class HostRecoveryTest(unittest.TestCase):
    def test_cage_pipe_closes_on_host_death_with_live_helper(self):
        for death_signal in (signal.SIGKILL, signal.SIGTERM):
            with self.subTest(signal=death_signal), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                # Replace only GI: emulate a library starting a helper which stays
                # alive after its parent dies, as WebKit helpers can do.
                (root / "gi.py").write_text(
                    "import os, subprocess, sys, time\n"
                    "from pathlib import Path\n"
                    "child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'], "
                    "close_fds=False, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)\n"
                    "ready = Path(os.environ['HELPER_PID_FILE'])\n"
                    "ready.with_suffix('.tmp').write_text(str(child.pid))\n"
                    "ready.with_suffix('.tmp').replace(ready)\n"
                    "time.sleep(60)\n"
                )
                helper_file = root / "helper.pid"
                read_fd, write_fd = os.pipe()
                helper_pid = None
                host = subprocess.Popen(
                    [sys.executable, str(HOST)], pass_fds=(write_fd,),
                    env={**os.environ, "PYTHONPATH": tmp, "XDG_RUNTIME_DIR": tmp,
                         "HELPER_PID_FILE": str(helper_file)},
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                os.close(write_fd)
                try:
                    deadline = time.monotonic() + 5
                    while not helper_file.exists() and time.monotonic() < deadline:
                        self.assertIsNone(host.poll(), "host exited before starting helper")
                        time.sleep(0.02)
                    self.assertTrue(helper_file.exists(), "helper did not start")
                    helper_pid = int(helper_file.read_text())
                    self.assertFalse(select.select([read_fd], [], [], 0)[0],
                                     "Cage pipe must stay open while host lives")
                    host.send_signal(death_signal)
                    host.wait(timeout=3)
                    os.kill(helper_pid, 0)
                    self.assertTrue(select.select([read_fd], [], [], 2)[0],
                                    "live helper retained Cage pipe after host death")
                    self.assertEqual(os.read(read_fd, 1), b"")
                finally:
                    if host.poll() is None:
                        host.kill()
                    host.wait()
                    if helper_pid is not None:
                        os.kill(helper_pid, signal.SIGKILL)
                    os.close(read_fd)


if __name__ == "__main__":
    unittest.main()
