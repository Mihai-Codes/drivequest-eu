"""Validate country packs against the template schema + DriveQuest rules.

Rules: ids unique, correct ⊆ options (per language), multi ⇒ ≥2 correct,
every question has article + explanation, chapter ids resolve,
lawValidThrough fresh (<12mo hard fail, <10mo warn).
"""
import datetime
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "content" / "packs" / "_template" / "schema.json").read_text())
REQUIRED_TOP = SCHEMA["required"]

errors: list[str] = []
warnings: list[str] = []


def err(pack: str, msg: str) -> None:
    errors.append(f"[{pack}] {msg}")


def check_pack(path: Path) -> None:
    name = path.parent.name
    try:
        pack = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        err(name, f"invalid JSON: {exc}")
        return
    for key in REQUIRED_TOP:
        if key not in pack:
            err(name, f"missing top-level key: {key}")
    if errors and errors[-1].startswith(f"[{name}] missing"):
        return
    chapters = {c["id"] for c in pack.get("chapters", []) if "id" in c}
    seen: set[str] = set()
    for q in pack.get("questions", []):
        qid = q.get("id", "?")
        if qid in seen:
            err(name, f"duplicate id: {qid}")
        seen.add(qid)
        if q.get("chapter") not in chapters:
            err(name, f"{qid}: unknown chapter {q.get('chapter')!r}")
        opts = q.get("options", {})
        langs = set(pack["meta"]["languages"])
        for lang in langs:
            if lang not in opts:
                err(name, f"{qid}: options missing language {lang}")
        first_lang_opts = set(next(iter(opts.values()), {}).keys())
        for c in q.get("correct", []):
            if c not in first_lang_opts:
                err(name, f"{qid}: correct key {c!r} not in options")
        if q.get("type") == "multi" and len(q.get("correct", [])) < 2:
            err(name, f"{qid}: multi with <2 correct answers")
        if not q.get("article"):
            err(name, f"{qid}: missing law article citation")
        if not q.get("explanation"):
            err(name, f"{qid}: missing explanation")
        if q.get("media"):
            media_path = path.parent / "media" / q["media"]
            if not media_path.is_file():
                err(name, f"{qid}: media file missing: {q['media']}")
    fseen: set[str] = set()
    for f in pack.get("fines", []):
        fid = f.get("id", "?")
        if fid in fseen:
            err(name, f"duplicate fine id: {fid}")
        fseen.add(fid)
        if not f.get("articol"):
            err(name, f"{fid}: missing article")
        if not f.get("fapta"):
            err(name, f"{fid}: missing fapta")
        for lang in pack["meta"]["languages"]:
            if lang not in f.get("fapta", {}):
                err(name, f"{fid}: fapta missing language {lang}")
    try:
        year_s, month_s = pack["meta"]["lawValidThrough"].split("-")
        valid = datetime.date(int(year_s), int(month_s), 1)
        age_months = (datetime.date.today() - valid).days / 30.44
        if age_months > 12:
            err(name, f"lawValidThrough stale ({pack['meta']['lawValidThrough']})")
        elif age_months > 10:
            warnings.append(f"[{name}] law pack ageing, review soon")
    except (ValueError, KeyError):
        err(name, "bad lawValidThrough (want YYYY-MM)")


def main() -> int:
    packs = sorted((ROOT / "content" / "packs").glob("*/pack.json"))
    packs = [p for p in packs if "_template" not in p.parts]
    if not packs:
        print("no country packs yet (template only) — ok")
        return 0
    for path in packs:
        check_pack(path)
    for w in warnings:
        print("WARN:", w)
    if errors:
        print(f"{len(errors)} error(s):")
        for e in errors:
            print("FAIL:", e)
        return 1
    print(f"{len(packs)} pack(s) valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
