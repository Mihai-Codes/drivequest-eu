#!/usr/bin/env python3
"""Dump the full ABC Auto question bank from the decrypted .sdf.

Source: cd-extract/ABCAutoB.sdf (SQL CE 3.5, password in EXE connection string).
Output: cd-extract/cd_bank.json — verbatim RO source of truth, no translation:
  {categories: [...], questions: [...], fines: [...]}
Question rows keep CD ids (id), category id, text, 3 options, correct letter,
image id (nume_poza; "0" = none), and the official explanation if present.

Usage: python3 scripts/dump_cd_bank.py
Requires: pip install sqlce
"""

import json
import os
import sys

PROJECT = "/Users/mihai/Glaze/DriveQuest EU"
SDF = os.path.join(PROJECT, "cd-extract", "ABCAutoB.sdf")
OUT = os.path.join(PROJECT, "cd-extract", "cd_bank.json")

# Password recovered from the EXE's own connection string
# (Data Source='...ABCAutoB.sdf';Password = '...'). Kept here so the dump is
# reproducible without re-running strings on the binary.
PASSWORD = "cucurucu"


def norm(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s != "None" else None


def main():
    try:
        from sqlce import SqlceDatabase
    except ImportError:
        print("FAIL: pip install sqlce")
        return 1
    if not os.path.exists(SDF):
        print(f"FAIL: {SDF} missing")
        return 1
    db = SqlceDatabase(SDF, password=PASSWORD)

    categories = []
    for row in db.read_table("categorii_intrebari"):
        categories.append({k: norm(v) for k, v in row.items()})

    questions = []
    for row in db.read_table("intrebari"):
        q = {k: norm(v) for k, v in row.items()}
        questions.append(q)

    fines = []
    for row in db.read_table("amenzi"):
        fines.append({k: norm(v) for k, v in row.items()})

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(
            {"categories": categories, "questions": questions, "fines": fines},
            f,
            ensure_ascii=False,
            indent=1,
        )

    with_img = sum(1 for q in questions if q.get("nume_poza") not in (None, "0"))
    print(f"categories: {len(categories)}")
    print(f"questions: {len(questions)} ({with_img} with images)")
    print(f"fines: {len(fines)}")
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
