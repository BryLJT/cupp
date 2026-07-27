#!/usr/bin/env python3
"""
upload_and_scan.py — Block 3: the real-photo pipeline test.

Takes local photos (Bryan's phone shots in fixtures/phone/, or explicit paths),
pushes each through the EXACT flow the app will use, and records the evidence:

    local file → (HEIC→JPEG, optional resize) → upload to Supabase Storage
    → signed URL (self-checked with a GET) → Agnes vision extraction
    → per-photo JSON in out/ + one summary.csv

This is the go/no-go table for the LaunchPad AI centrepiece: does grounding
hold on real-world photos (glare, angles, handwriting), and how slow is it?

Usage (keys live in scripts/.env — never commit it):
    cd scripts
    python3 upload_and_scan.py                      # batch fixtures/phone/
    python3 upload_and_scan.py fixtures/sey_huila.jpg   # explicit file(s)
    python3 upload_and_scan.py --resize 1280        # sips -Z downsize first
    python3 upload_and_scan.py --strategy double-check --ttl 900

Reuses the validated pieces of scan_spike.py (prompt, model call, JSON parse).
"""

import argparse
import csv
import json
import mimetypes
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# --- load scripts/.env BEFORE importing the spike (it reads env at import) ----
def load_env(path: Path) -> None:
    """Minimal .env loader: KEY=VALUE lines, no quotes handling beyond strip."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env(SCRIPT_DIR / ".env")

from scan_spike import (  # noqa: E402
    CONFIDENCE_INSTRUCTION,
    FIELDS,
    GROUNDING_INSTRUCTION,
    call_model,
    print_table,
    reconcile,
)

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
BUCKET = "bag-scans"

FIXTURES_PHONE = SCRIPT_DIR / "fixtures" / "phone"
OUT_DIR = SCRIPT_DIR / "out"

RATE_LIMIT_SLEEP_S = 3.5  # free tier ~20 RPM
RATE_LIMIT_BACKOFF_S = 30.0


# ---------------------------------------------------------------------------
# local preprocessing: HEIC → JPEG, optional resize (both via macOS sips)
# ---------------------------------------------------------------------------

def is_heic(path: Path) -> bool:
    return path.suffix.lower() in {".heic", ".heif"}


def sips(args: list[str]) -> None:
    result = subprocess.run(["sips", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"sips failed: {result.stderr.strip()}")


def preprocess(path: Path, resize: int | None, workdir: Path) -> Path:
    """Return a JPEG/PNG path ready for upload, converting/resizing if needed."""
    needs_convert = is_heic(path)
    if not needs_convert and resize is None:
        return path

    out = workdir / (path.stem + ".jpg" if needs_convert else path.name)
    if needs_convert:
        sips(["-s", "format", "jpeg", str(path), "--out", str(out)])
    else:
        out.write_bytes(path.read_bytes())
    if resize is not None:
        sips(["-Z", str(resize), str(out)])
    return out


# ---------------------------------------------------------------------------
# Supabase Storage: upload + signed URL (+ GET self-check)
# ---------------------------------------------------------------------------

def storage_headers(content_type: str | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "apikey": SERVICE_ROLE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "true"
    return headers


def upload(local: Path, object_path: str) -> float:
    """Upload raw bytes; returns elapsed ms. Raises on non-2xx."""
    content_type = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_path}"
    t0 = time.time()
    resp = requests.post(url, headers=storage_headers(content_type), data=local.read_bytes(), timeout=120)
    elapsed_ms = (time.time() - t0) * 1000
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"upload HTTP {resp.status_code}: {resp.text[:300]}")
    return elapsed_ms


def signed_url(object_path: str, ttl_s: int) -> str:
    """Create a signed URL and SELF-CHECK it with a GET before returning."""
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{object_path}"
    resp = requests.post(url, headers=storage_headers("application/json"), json={"expiresIn": ttl_s}, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"sign HTTP {resp.status_code}: {resp.text[:300]}")
    relative = resp.json().get("signedURL")
    if not relative:
        raise RuntimeError(f"sign response missing signedURL: {resp.text[:300]}")
    # The API returns a RELATIVE path — build the absolute URL ourselves.
    full = f"{SUPABASE_URL}/storage/v1{relative}"
    check = requests.get(full, timeout=30)
    if check.status_code != 200:
        raise RuntimeError(f"signed-URL self-check GET {check.status_code} — not spending an Agnes call on it")
    return full


# ---------------------------------------------------------------------------
# per-photo run
# ---------------------------------------------------------------------------

def count_read_fields(parsed: dict | None) -> int:
    if not parsed or "fields" not in parsed:
        return 0
    n = 0
    for f in FIELDS:
        cell = parsed["fields"].get(f) or {}
        if cell.get("value") is not None and cell.get("basis") in ("read", "inferred", "agreed"):
            n += 1
    return n


def call_model_with_retry(url: str, instruction: str, attempts: int = 3):
    """Agnes free tier intermittently returns HTTP 200 with EMPTY content
    (observed 2026-07-22, ~2/6 calls). Retry those; real errors pass through."""
    parsed, raw, latency, meta = call_model(url, instruction)
    for _ in range(attempts - 1):
        empty_success = meta.get("status") == 200 and parsed is None and not (raw or "").strip()
        if not empty_success:
            break
        print("  empty response from model — retrying")
        time.sleep(RATE_LIMIT_SLEEP_S)
        parsed, raw, latency, meta = call_model(url, instruction)
    return parsed, raw, latency, meta


def scan_one(photo: Path, args, workdir: Path) -> dict:
    row = {
        "file": photo.name,
        "size_kb": None,
        "upload_ms": None,
        "agnes_s": None,
        "is_coffee_bag": None,
        "fields_read": None,
        "error": None,
    }
    try:
        prepared = preprocess(photo, args.resize, workdir)
        row["size_kb"] = round(prepared.stat().st_size / 1024, 1)

        object_path = f"phone/{int(time.time())}-{prepared.name}"
        row["upload_ms"] = round(upload(prepared, object_path))
        url = signed_url(object_path, args.ttl)

        instruction = CONFIDENCE_INSTRUCTION if args.strategy == "confidence" else GROUNDING_INSTRUCTION
        if args.strategy == "double-check":
            p1, _, l1, m1 = call_model_with_retry(url, instruction)
            time.sleep(RATE_LIMIT_SLEEP_S)
            p2, _, l2, m2 = call_model_with_retry(url, instruction)
            parsed, latency, meta = reconcile(p1, p2), l1 + l2, m1
        else:
            parsed, _, latency, meta = call_model_with_retry(url, instruction)

        if meta.get("rate_limited"):
            print(f"  RATE LIMITED — backing off {RATE_LIMIT_BACKOFF_S:.0f}s and retrying once")
            time.sleep(RATE_LIMIT_BACKOFF_S)
            parsed, _, latency, meta = call_model_with_retry(url, instruction)

        if meta.get("status") != 200:
            raise RuntimeError(f"model HTTP {meta.get('status')}")

        row["agnes_s"] = round(latency, 1)
        row["is_coffee_bag"] = (parsed or {}).get("is_coffee_bag")
        row["fields_read"] = count_read_fields(parsed)

        out_json = OUT_DIR / f"{photo.stem}.json"
        out_json.write_text(json.dumps({"photo": photo.name, "object_path": object_path,
                                        "strategy": args.strategy, "latency_s": row["agnes_s"],
                                        "result": parsed}, indent=2))
        print_table(parsed, args.strategy)
        print(f"  latency: {latency:.1f}s  |  upload: {row['upload_ms']}ms  |  size: {row['size_kb']}KB")
    except Exception as e:  # keep batching — one bad photo shouldn't kill the run
        row["error"] = str(e)[:200]
        print(f"  ERROR: {row['error']}")
    return row


def main():
    ap = argparse.ArgumentParser(description="Cupp Block 3: upload → signed URL → Agnes, batched")
    ap.add_argument("photos", nargs="*", help="Photo paths; default = fixtures/phone/*")
    ap.add_argument("--strategy", choices=["grounding", "confidence", "double-check"], default="grounding")
    ap.add_argument("--ttl", type=int, default=600, help="Signed-URL lifetime seconds (default 600)")
    ap.add_argument("--resize", type=int, default=None, metavar="N", help="Downsize longest edge to N px first (sips -Z)")
    args = ap.parse_args()

    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        sys.exit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — put them in scripts/.env")
    if not os.environ.get("AI_API_KEY") and not os.environ.get("AGNES_API_KEY"):
        sys.exit("Missing AI_API_KEY (or AGNES_API_KEY) — put it in scripts/.env")

    if args.photos:
        photos = [Path(p) for p in args.photos]
    else:
        photos = sorted(p for p in FIXTURES_PHONE.glob("*")
                        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".heic", ".heif"})
    if not photos:
        sys.exit(f"No photos found. Drop phone shots into {FIXTURES_PHONE}/ or pass paths.")
    missing = [p for p in photos if not p.exists()]
    if missing:
        sys.exit(f"Not found: {', '.join(str(p) for p in missing)}")

    OUT_DIR.mkdir(exist_ok=True)
    print(f"{len(photos)} photo(s) | strategy={args.strategy} | resize={args.resize or 'off'} | ttl={args.ttl}s\n")

    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        for i, photo in enumerate(photos, 1):
            print(f"[{i}/{len(photos)}] {photo.name}")
            rows.append(scan_one(photo, args, workdir))
            print()
            if i < len(photos):
                time.sleep(RATE_LIMIT_SLEEP_S)

    summary = OUT_DIR / "summary.csv"
    with summary.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"{'file':<28} {'KB':>7} {'up ms':>7} {'agnes s':>8} {'bag?':>6} {'#read':>6}  error")
    for r in rows:
        print(f"{r['file'][:28]:<28} {str(r['size_kb'] or '-'):>7} {str(r['upload_ms'] or '-'):>7} "
              f"{str(r['agnes_s'] or '-'):>8} {str(r['is_coffee_bag']):>6} {str(r['fields_read'] or 0):>6}  {r['error'] or ''}")
    print(f"\nSummary: {summary}")


if __name__ == "__main__":
    main()
