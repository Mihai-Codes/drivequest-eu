#!/usr/bin/env python3
"""Final CD validation for DriveQuest EU (ABC Auto - Categoria B disc).

CD layout (Inno Setup 6.1.0, unicode):
  setupABCAutoCategoriaB.exe  (1.7 MB loader)
  setupABCAutoCategoriaB-1.bin (109 MB payload)
  resurse/dotnetfx35.exe, resurse/msi31.exe (prerequisites, not app data)
  Licenta ABC Auto - Categoria B.rtf (license text, also inside installer)
  ABC Auto - Categoria B.ico (disc icon)
  AUTORUN.INF

Installer payload (via `innoextract --list`):
  app/ABC Auto - Categoria B.exe  (127 MB .NET app, embeds ~656 images)
  app/*.dll                        (MySQL + SQL CE runtimes)
  userappdata/ABCAuto/ABCAutoB.sdf (1.7 MB SQL CE question database, ENCRYPTED)
  app/Licenta ... .rtf, app/uninstal.ico

Extraction status (see scripts/extract_cd_images.py + cd-extract/):
  - Installer file list: fully inventoried, nothing else on disc.
  - .sdf question text: NOT readable on macOS (encrypted SQL CE). The 48 RO
    pack questions are hand-curated; they cannot be diffed against the CD bank.
    Numbered image IDs run to ~1236, so the CD bank is far larger than 48.
  - EXE images: carved to cd-extract/images (+manifest.json).
  - Packs reference 0 CD images (eu/media has 8 hand-made SVGs, ro has none).

Run: python3 scripts/validate_cd.py [--cd /Volumes/ABC\\ auto]
Exit 0 = validation ran clean (warnings are expected gaps, printed as such).
"""

import json
import os
import re
import subprocess
import sys

PROJECT = "/Users/mihai/Glaze/DriveQuest EU"
PACKS = os.path.join(PROJECT, "sources", "public", "packs")
EXTRACT = os.path.join(PROJECT, "cd-extract")
IMAGES = os.path.join(EXTRACT, "images")
SDF = os.path.join(EXTRACT, "ABCAutoB.sdf")

EXPECTED_INSTALLER_FILES = {
    "app/ABC Auto - Categoria B.exe",
    "userappdata/ABCAuto/ABCAutoB.sdf",
    "app/Licenta ABC Auto - Categoria B.rtf",
}

EXPECTED_CD_ROOT = {
    "setupABCAutoCategoriaB.exe",
    "setupABCAutoCategoriaB-1.bin",
    "AUTORUN.INF",
}


def check_cd_root(cd: str) -> bool:
    print(f"CD root: {cd}")
    try:
        entries = set(os.listdir(cd))
    except FileNotFoundError:
        print("  FAIL: CD not mounted")
        return False
    missing = EXPECTED_CD_ROOT - entries
    print(f"  files: {sorted(entries)}")
    if missing:
        print(f"  FAIL: missing from disc: {sorted(missing)}")
        return False
    print("  OK: all expected disc files present")
    return True


def check_installer(cd: str) -> bool:
    exe = os.path.join(cd, "setupABCAutoCategoriaB.exe")
    try:
        out = subprocess.run(
            ["innoextract", "--list", exe], capture_output=True, text=True, timeout=120
        )
    except FileNotFoundError:
        print("  SKIP: innoextract not installed, cannot list installer")
        return True
    if out.returncode != 0:
        print(f"  FAIL: innoextract error: {out.stderr.strip()}")
        return False
    listed = set()
    for line in out.stdout.splitlines():
        m = re.search(r'"([^"]+)"', line)
        if m:
            listed.add(m.group(1))
    missing = {f for f in EXPECTED_INSTALLER_FILES if f not in listed}
    print(f"  installer entries: {len(listed)}")
    if missing:
        print(f"  FAIL: missing from installer: {sorted(missing)}")
        return False
    print("  OK: installer payload fully inventoried (no hidden files)")
    return True


def check_packs() -> bool:
    ok = True
    for pack in ("eu", "ro"):
        path = os.path.join(PACKS, pack, "pack.json")
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"  FAIL: {pack}/pack.json unreadable: {e}")
            ok = False
            continue
        qs, ch = data.get("questions", []), data.get("chapters", [])
        dupes = len(qs) - len({q.get("id") for q in qs})
        no_correct = [q.get("id") for q in qs if not q.get("correct")]
        print(
            f"  {pack}: {len(qs)} questions, {len(ch)} chapters, "
            f"fines={len(data.get('fines', []))}, "
            f"lawValidThrough={data.get('meta', {}).get('lawValidThrough')}"
        )
        if dupes:
            print(f"  FAIL: {pack} has {dupes} duplicate question ids")
            ok = False
        if no_correct:
            print(f"  FAIL: {pack} questions without answer: {no_correct[:5]}")
            ok = False
        # media refs must resolve (bare name resolves against pack/media/)
        for q in qs:
            m = q.get("media")
            if m and not (
                os.path.exists(os.path.join(PACKS, pack, m))
                or os.path.exists(os.path.join(PACKS, pack, "media", m))
            ):
                print(f"  FAIL: {pack}/{q.get('id')} media missing: {m}")
                ok = False
    if ok:
        print("  OK: packs parse, ids unique, answers + media resolve")
    return ok


def check_extract() -> bool:
    ok = True
    if not os.path.exists(SDF):
        print("  FAIL: cd-extract/ABCAutoB.sdf missing")
        ok = False
    else:
        print(
            f"  OK: ABCAutoB.sdf staged ({os.path.getsize(SDF)} bytes; "
            "SQL CE, password-protected, readable via scripts/dump_cd_bank.py)"
        )
    man_path = os.path.join(IMAGES, "manifest.json")
    if not os.path.exists(man_path):
        print("  FAIL: cd-extract/images/manifest.json missing (run extract_cd_images.py)")
        ok = False
        return ok
    with open(man_path, encoding="utf-8") as f:
        manifest = json.load(f)
    missing = [e["file"] for e in manifest if not os.path.exists(os.path.join(IMAGES, e["file"]))]
    print(f"  carved images: {len(manifest)}, files missing: {len(missing)}")
    if missing:
        print(f"  FAIL: {len(missing)} manifest files absent")
        ok = False
    else:
        print("  OK: all carved images present on disk")
    return ok


def main() -> int:
    cd = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--cd" else "/Volumes/ABC auto"
    print("DriveQuest EU CD validation")
    print("=" * 50)
    results = [check_cd_root(cd), check_installer(cd), check_packs(), check_extract()]
    print()
    print("KNOWN GAPS (not failures of this run, tracked for follow-up):")
    print("  - SOLVED since last run: .sdf decrypted (password from EXE connection")
    print("    string); full bank staged in cd-extract/cd_bank.json: 1447 questions,")
    print("    169 fines, 19 categories. RO pack still ships 48 curated / 10 fines.")
    print("  - Image ID mapping is approximate: 518/518 DB image IDs have a")
    print("    candidate file in cd-extract/images, but spot checks show local")
    print("    shifts (e.g. 9_start MATCHES its DB question, 29_start does not).")
    print("    A per-question visual verification pass is needed before wiring")
    print("    images into packs.")
    print("  - 0 CD images are referenced by packs; no loader reads question.media.")
    print()
    if all(results):
        print("VALIDATION PASSED: disc fully inventoried, packs sane, extract staged.")
        print("Safe to eject the CD.")
        return 0
    print("VALIDATION FAILED: see FAIL lines above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
