#!/usr/bin/env python3
"""Export the terminology-review worksheet for a country pack.

CONTENT-PIPELINE.md promises a reviewer handoff:
  "export content/packs/<cc>/review.csv".
Every EN string a pack ships is machine-translated until a native speaker signs
off, so the reviewer needs one row per string, with the Romanian source beside
it and an empty verdict column to fill in.

One row per translatable string (stem, each option, explanation) rather than
per question: a reviewer ticks wording, not whole items, and per-string rows
mean a partial pass is still mergeable.

review.csv is generated - never hand-edit it; regenerate after pack changes:
  python3 scripts/review_export.py                 # every pack
  python3 scripts/review_export.py --country ro    # one pack
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

# Repo-relative so the script works from any checkout, not just this machine.
DEFAULT_PACK_ROOT = Path(__file__).resolve().parent.parent / "content" / "packs"
# Reviewer fills these two; everything before them is read-only context.
VERDICT_COLS = ["verdict(ok|fix|drop)", "corrected_en"]


def rows_for_pack(pack: dict) -> list[dict]:
    titles = {c["id"]: c.get("title", {}).get("en", c["id"]) for c in pack.get("chapters", [])}
    out = []
    for q in pack.get("questions", []):
        qid, chapter = q.get("id", ""), q.get("chapter", "")
        stem = q.get("stem", {}) or {}
        options = q.get("options", {}) or {}
        explanation = q.get("explanation", {}) or {}
        correct = set(q.get("correct", []) or [])

        def add(field: str, key: str, ro: str, en: str, is_correct: str) -> None:
            out.append(
                {
                    "id": qid,
                    "chapter": titles.get(chapter, chapter),
                    "field": field if not key else f"{field}.{key}",
                    "ro": ro,
                    "en": en,
                    "is_correct_option": is_correct,
                    "article": q.get("article", ""),
                    "review_tag": q.get("review", ""),
                    "media": q.get("media") or "",
                    VERDICT_COLS[0]: "",
                    VERDICT_COLS[1]: "",
                }
            )

        add("stem", "", stem.get("ro", ""), stem.get("en", ""), "")
        for key in sorted(options.get("ro", {}) or {}):
            add("option", key, options.get("ro", {}).get(key, ""), options.get("en", {}).get(key, ""), "yes" if key in correct else "")
        add("explanation", "", explanation.get("ro", ""), explanation.get("en", ""), "")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default="ro")
    ap.add_argument("--pack-dir", type=Path, default=DEFAULT_PACK_ROOT)
    ap.add_argument("--out", type=Path, default=None, help="default: <pack-dir>/<country>/review.csv")
    args = ap.parse_args()

    pack_path = args.pack_dir / args.country / "pack.json"
    if not pack_path.is_file():
        print(f"no pack at {pack_path}", file=sys.stderr)
        return 1
    pack = json.loads(pack_path.read_text())
    rows = rows_for_pack(pack)
    out = args.out or pack_path.parent / "review.csv"
    with out.open("w", newline="", encoding="utf-8-sig") as handle:  # BOM: Excel opens RO diacritics correctly
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    tagged = sum(1 for q in pack.get("questions", []) if q.get("review"))
    print(f"{args.country}: {len(pack.get('questions', []))} questions ({tagged} flagged for review) -> {len(rows)} rows")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
