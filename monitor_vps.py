#!/usr/bin/env python3
"""
monitor_vps.py
==============
Continuous health monitor for the VPS.
- Checks FastAPI /health endpoint
- Checks Next.js webapp HTTP response
- Checks available disk and memory
- Logs alerts and restarts PM2 processes if they're down

Run under PM2:
  pm2 start /root/cultivation-scraper/cultivation-scraper/monitor_vps.py \
      --name monitor --interpreter python3 --restart-delay 10000

Or directly:
  python3 monitor_vps.py
"""

import os
import sys
import time
import signal
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────────────
CHECK_INTERVAL   = 60          # seconds between full health checks
WEBAPP_URL       = "http://127.0.0.1:3000"
FASTAPI_URL      = "http://127.0.0.1:8000/health"
DISK_WARN_PCT    = 85          # warn when disk usage exceeds this %
MEM_WARN_PCT     = 90          # warn when RAM usage exceeds this %
LOG_FILE         = "/root/cultivation-scraper/output/monitor.log"
SCRAPER_SCRIPT   = "/root/cultivation-scraper/2_scrape_novels.py"
SCRAPER_LOG      = "/root/cultivation-scraper/output/scrape_log.txt"
SCRAPER_WORKERS  = 2           # safe worker count for 4-CPU VPS

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)


def ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def log(msg, level="INFO"):
    line = f"[{ts()}] [{level}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def http_ok(url: str, timeout: int = 10) -> tuple[bool, str]:
    """Return (success, detail). For FastAPI also checks JSON ok field."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            status = resp.status
            body   = resp.read(512).decode("utf-8", errors="replace")
            if status == 200:
                return True, f"HTTP {status}"
            return False, f"HTTP {status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP error {e.code}"
    except urllib.error.URLError as e:
        return False, f"Connection error: {e.reason}"
    except Exception as e:
        return False, f"Error: {e}"


def pm2_status(name: str) -> str:
    """Return the PM2 online status of a process."""
    try:
        out = subprocess.check_output(
            ["pm2", "jlist"], stderr=subprocess.DEVNULL, timeout=10
        ).decode("utf-8")
        import json
        procs = json.loads(out)
        for p in procs:
            if p.get("name") == name:
                return p.get("pm2_env", {}).get("status", "unknown")
        return "not_found"
    except Exception as e:
        return f"error({e})"


def pm2_restart(name: str):
    """Restart a PM2 process."""
    try:
        subprocess.run(["pm2", "restart", name], timeout=30, check=True)
        log(f"PM2 restart issued for '{name}'", "RECOVER")
    except Exception as e:
        log(f"PM2 restart FAILED for '{name}': {e}", "ERROR")


def disk_usage(path: str = "/") -> tuple[int, int, int]:
    """Return (used_gb, total_gb, pct)."""
    import shutil
    total, used, _ = shutil.disk_usage(path)
    pct = int(used * 100 / total)
    return used >> 30, total >> 30, pct


def mem_usage() -> tuple[int, int, int]:
    """Return (used_mb, total_mb, pct). Reads /proc/meminfo."""
    try:
        with open("/proc/meminfo") as f:
            lines = {l.split(":")[0]: int(l.split()[1]) for l in f if ":" in l}
        total_kb    = lines.get("MemTotal", 1)
        avail_kb    = lines.get("MemAvailable", total_kb)
        used_kb     = total_kb - avail_kb
        pct         = int(used_kb * 100 / total_kb)
        return used_kb >> 10, total_kb >> 10, pct
    except Exception:
        return 0, 0, 0


def scraper_pids() -> list[int]:
    """Return PIDs of all running 2_scrape_novels.py processes."""
    try:
        out = subprocess.check_output(
            ["pgrep", "-f", "2_scrape_novels.py"], stderr=subprocess.DEVNULL
        ).decode().strip()
        return [int(p) for p in out.split() if p.isdigit()]
    except subprocess.CalledProcessError:
        return []


def scraper_worker_count(pid: int) -> int | None:
    """Return the --workers N value for a given PID, or None if not found."""
    try:
        cmd = open(f"/proc/{pid}/cmdline").read().replace("\0", " ")
        parts = cmd.split()
        for i, p in enumerate(parts):
            if p == "--workers" and i + 1 < len(parts):
                return int(parts[i + 1])
        return None
    except Exception:
        return None


def kill_pid(pid: int, sig=signal.SIGKILL):
    try:
        os.kill(pid, sig)
    except ProcessLookupError:
        pass


def manage_scraper():
    """Ensure exactly one 2_scrape_novels.py --workers 2 is running.
    Kill any instance running with more workers (overloaded / rogue).
    """
    pids = scraper_pids()
    if not pids:
        # No scraper running — start one
        try:
            subprocess.Popen(
                ["nohup", "/root/cultivation-scraper/venv/bin/python",
                 SCRAPER_SCRIPT, "--workers", str(SCRAPER_WORKERS)],
                stdout=open(SCRAPER_LOG, "a"),
                stderr=subprocess.STDOUT,
                cwd="/root/cultivation-scraper",
                start_new_session=True,  # fully detach from monitor
            )
            log(f"scraper: started {SCRAPER_SCRIPT} --workers {SCRAPER_WORKERS}", "INFO")
        except Exception as e:
            log(f"scraper: failed to start — {e}", "ERROR")
        return

    # At least one instance running — audit each one
    good_pid = None
    for pid in pids:
        wk = scraper_worker_count(pid)
        if wk is None:
            continue
        if wk > SCRAPER_WORKERS:
            # Rogue high-worker instance — kill it
            kill_pid(pid)
            log(f"scraper: killed rogue PID {pid} --workers {wk}", "WARN")
        elif wk == SCRAPER_WORKERS and good_pid is None:
            good_pid = pid  # keep the first healthy one
        elif wk == SCRAPER_WORKERS and good_pid is not None:
            # Duplicate — kill extras
            kill_pid(pid)
            log(f"scraper: killed duplicate PID {pid} --workers {wk}", "WARN")

    if good_pid:
        log(f"scraper: OK — PID {good_pid} --workers {SCRAPER_WORKERS}")
    else:
        # All were rogue; restart clean
        try:
            subprocess.Popen(
                ["nohup", "/root/cultivation-scraper/venv/bin/python",
                 SCRAPER_SCRIPT, "--workers", str(SCRAPER_WORKERS)],
                stdout=open(SCRAPER_LOG, "a"),
                stderr=subprocess.STDOUT,
                cwd="/root/cultivation-scraper",
                start_new_session=True,
            )
            log(f"scraper: restarted --workers {SCRAPER_WORKERS} (after killing rogues)", "RECOVER")
        except Exception as e:
            log(f"scraper: restart failed — {e}", "ERROR")


def check_all():
    ok_webapp, detail_webapp = http_ok(WEBAPP_URL)
    ok_api,    detail_api    = http_ok(FASTAPI_URL)

    # ── Web app ─────────────────────────────────────────────────────────────
    if ok_webapp:
        log(f"webapp OK — {detail_webapp}")
    else:
        log(f"webapp DOWN — {detail_webapp}", "WARN")
        status = pm2_status("cultivationai")
        log(f"  PM2 status: {status}", "WARN")
        if status != "online":
            pm2_restart("cultivationai")

    # ── FastAPI ─────────────────────────────────────────────────────────────
    if ok_api:
        log(f"fastapi OK — {detail_api}")
    else:
        log(f"fastapi DOWN — {detail_api}", "WARN")
        status = pm2_status("fastapi")
        log(f"  PM2 status: {status}", "WARN")
        if status != "online":
            pm2_restart("fastapi")

    # ── Disk ─────────────────────────────────────────────────────────────────
    used_gb, total_gb, disk_pct = disk_usage("/")
    lvl = "WARN" if disk_pct >= DISK_WARN_PCT else "INFO"
    log(f"disk {used_gb}/{total_gb} GB ({disk_pct}%)", lvl)

    # ── Memory ───────────────────────────────────────────────────────────────
    used_mb, total_mb, mem_pct = mem_usage()
    lvl = "WARN" if mem_pct >= MEM_WARN_PCT else "INFO"
    log(f"mem  {used_mb}/{total_mb} MB ({mem_pct}%)", lvl)

    # ── Scraper ───────────────────────────────────────────────────────────────
    manage_scraper()


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log("=== Monitor started ===")
    while True:
        try:
            check_all()
        except Exception as e:
            log(f"Monitor loop error: {e}", "ERROR")
        time.sleep(CHECK_INTERVAL)
