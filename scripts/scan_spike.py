#!/usr/bin/env python3
"""
scan_spike.py — Feasibility spike for Cupp's photo-first bag scan.

Sends a coffee-bag image (by PUBLIC URL) to an OpenAI-compatible vision chat
model and asks it to extract Cupp's "bean" fields as structured JSON, using a
grounding guardrail: every field must cite the text it was read from, and gets
nulled if it isn't visible on the bag.

The point of this script is to answer three questions with a real call:
  1. Accuracy  — do the extracted fields match the actual label?
  2. Honesty   — does `basis` tell the truth (read vs inferred vs not_visible),
                 or does it hallucinate a roaster/origin that isn't there?
  3. Structure — does the model return valid JSON we can prefill a form with?

Usage:
    export AGNES_API_KEY=sk-...                      # your Agnes key
    python3 scan_spike.py <image_url> [<image_url> ...]

Strategies (the pluggable guardrail from the design — A/B/C):
    --strategy grounding      (A, default) per-field value + source_text + basis
    --strategy confidence     (C) per-field value + self-reported confidence
    --strategy double-check   (B) run grounding twice, keep only fields that agree

Provider is env-configurable so Agnes <-> OpenAI is a swap, not a rewrite:
    AI_BASE_URL   default https://apihub.agnes-ai.com/v1
    AI_MODEL      default agnes-2.0-flash
    AI_API_KEY    if unset, falls back to AGNES_API_KEY, then OPENAI_API_KEY
"""

import argparse
import json
import os
import re
import sys
import time

import requests

# --- Provider config (env-swappable: Agnes today, OpenAI as fallback) ---------
BASE_URL = os.environ.get("AI_BASE_URL", "https://apihub.agnes-ai.com/v1").rstrip("/")
MODEL = os.environ.get("AI_MODEL", "agnes-2.0-flash")
API_KEY = (
    os.environ.get("AI_API_KEY")
    or os.environ.get("AGNES_API_KEY")
    or os.environ.get("OPENAI_API_KEY")
)

# --- The output contract: Cupp's bean fields (price excluded from MVP scan) ----
FIELDS = [
    "roaster",
    "coffee_name",
    "origin_country",
    "origin_region",
    "process",
    "variety",
    "roast_level",
    "altitude",
    "roast_date",
    "roaster_tasting_notes",  # the ROASTER's printed notes, not the user's
    "weight",
    "decaf",
]

SYSTEM = (
    "You read specialty-coffee bag labels and extract structured data. "
    "You never invent information. If a value is not clearly printed on the bag, "
    "you leave it null. Marketing copy is not a substitute for a stated field."
)

# Strategy A — grounding. Each field must cite where it was read.
GROUNDING_INSTRUCTION = f"""Extract these fields from the coffee bag in the image: {", ".join(FIELDS)}.

Return ONLY a JSON object of this exact shape:
{{
  "is_coffee_bag": <true|false>,
  "fields": {{
    "<field>": {{ "value": <value or null>, "source_text": <exact text you read it from, or null>, "basis": "read" | "inferred" | "not_visible" }}
  }}
}}

Rules:
- "read": the value is literally printed on the bag. Put the exact snippet in source_text.
- "inferred": you are guessing from context, not reading it. Use sparingly.
- "not_visible": the field is not shown. Set value AND source_text to null.
- roaster_tasting_notes is an array of the ROASTER's printed flavour descriptors (e.g. ["blueberry","cocoa"]). Do not invent notes.
- decaf: value true only if the bag says decaf/decaffeinated; else false with basis "read" if it clearly states caffeinated/nothing, or "not_visible".
- Do not guess roaster or origin. If you cannot read them, they are not_visible.
Return the JSON and nothing else."""

# Strategy C — self-reported confidence (kept for comparison; uncalibrated).
CONFIDENCE_INSTRUCTION = f"""Extract these fields from the coffee bag in the image: {", ".join(FIELDS)}.

Return ONLY a JSON object of this exact shape:
{{
  "is_coffee_bag": <true|false>,
  "fields": {{
    "<field>": {{ "value": <value or null>, "confidence": <0.0-1.0> }}
  }}
}}
Leave value null for anything not shown. roaster_tasting_notes is an array.
Return the JSON and nothing else."""


def build_payload(image_url, instruction, force_json=True):
    payload = {
        "model": MODEL,
        "temperature": 0,
        "max_tokens": 1500,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
    }
    if force_json:
        payload["response_format"] = {"type": "json_object"}
    return payload


def call_model(image_url, instruction):
    """One request. Returns (parsed_json_or_None, raw_text, latency_s, meta)."""
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    url = f"{BASE_URL}/chat/completions"

    def _post(force_json):
        t0 = time.time()
        r = requests.post(url, headers=headers, json=build_payload(image_url, instruction, force_json), timeout=90)
        return r, time.time() - t0

    resp, latency = _post(force_json=True)
    # Some gateways reject response_format — retry once without it.
    if resp.status_code == 400 and "response_format" in resp.text:
        resp, latency = _post(force_json=False)

    meta = {"status": resp.status_code, "json_mode": resp.status_code != 400}
    if resp.status_code == 429:
        return None, resp.text, latency, {**meta, "rate_limited": True}
    if resp.status_code != 200:
        return None, resp.text, latency, meta

    body = resp.json()
    content = body["choices"][0]["message"]["content"]
    return parse_json(content), content, latency, meta


def parse_json(text):
    """Tolerant parse: direct load, else grab the first {...} block."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", text or "", re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


def reconcile(a, b):
    """Strategy B: keep a field only if both runs agree (case-insensitive)."""
    out = {}
    fa, fb = (a or {}).get("fields", {}), (b or {}).get("fields", {})
    for f in FIELDS:
        va = (fa.get(f) or {}).get("value")
        vb = (fb.get(f) or {}).get("value")
        agree = str(va).strip().lower() == str(vb).strip().lower()
        out[f] = {
            "value": va if agree else None,
            "basis": "agreed" if agree else "disagree",
            "source_text": (fa.get(f) or {}).get("source_text") if agree else None,
        }
    return {"is_coffee_bag": (a or {}).get("is_coffee_bag"), "fields": out}


def print_table(parsed, strategy):
    if not parsed or "fields" not in parsed:
        print("  (no structured fields parsed)")
        return
    gate = parsed.get("is_coffee_bag")
    print(f"  is_coffee_bag: {gate}")
    secondary = "confidence" if strategy == "confidence" else "basis"
    print(f"  {'field':<22} {'value':<34} {secondary}")
    print(f"  {'-'*22} {'-'*34} {'-'*12}")
    for f in FIELDS:
        cell = parsed["fields"].get(f) or {}
        val = cell.get("value")
        val = "-" if val is None else (", ".join(val) if isinstance(val, list) else str(val))
        second = cell.get(secondary, "")
        print(f"  {f:<22} {val[:34]:<34} {second}")


def main():
    ap = argparse.ArgumentParser(description="Cupp bag-scan feasibility spike")
    ap.add_argument("image_urls", nargs="+", help="Public image URL(s) of coffee bags")
    ap.add_argument("--strategy", choices=["grounding", "confidence", "double-check"], default="grounding")
    ap.add_argument("--raw", action="store_true", help="Also print the raw model response")
    args = ap.parse_args()

    if not API_KEY:
        sys.exit("No API key. Set AGNES_API_KEY (or AI_API_KEY) in your env and re-run.")

    print(f"Provider: {BASE_URL}  |  Model: {MODEL}  |  Strategy: {args.strategy}\n")

    for i, image_url in enumerate(args.image_urls, 1):
        print(f"[{i}/{len(args.image_urls)}] {image_url}")
        instruction = CONFIDENCE_INSTRUCTION if args.strategy == "confidence" else GROUNDING_INSTRUCTION

        if args.strategy == "double-check":
            p1, _, l1, m1 = call_model(image_url, instruction)
            p2, _, l2, m2 = call_model(image_url, instruction)
            parsed, latency, meta, raw = reconcile(p1, p2), l1 + l2, m1, "(two-pass; raw omitted)"
        else:
            parsed, raw, latency, meta = call_model(image_url, instruction)

        if meta.get("rate_limited"):
            print("  RATE LIMITED (429) — wait and retry (free tier ~20 RPM).\n")
            continue
        if meta.get("status") != 200 and args.strategy != "double-check":
            print(f"  HTTP {meta.get('status')}: {str(raw)[:300]}\n")
            continue

        print_table(parsed, args.strategy)
        print(f"  latency: {latency:.1f}s  |  json_mode: {meta.get('json_mode')}")
        if args.raw and args.strategy != "double-check":
            print("  --- raw ---")
            print("  " + str(raw)[:1200])
        print()


if __name__ == "__main__":
    main()
