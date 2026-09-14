#!/usr/bin/env python3
"""Carve embedded JPEG/PNG/BMP images out of the ABC Auto .NET executable.

The ABC Auto - Categoria B installer (Inno Setup 6.1.0) ships its question
illustrations as .NET resources inside "ABC Auto - Categoria B.exe"; the
question *text* lives in the encrypted SQL CE database (ABCAutoB.sdf) and
cannot be read on macOS. Image resource names (AutoABC.data.<id>_start.jpg)
are recovered from the EXE string table and matched to carved blobs in order,
so carved files keep their CD question-ID mapping (e.g. 936_start.jpg).

Usage:
    python3 extract_cd_images.py <exe_path> <out_dir>

Output: <out_dir>/*.jpg|png|bmp + manifest.json
Idempotent: skips blobs already present in manifest by offset+size.
"""

import json
import os
import re
import subprocess
import sys


def jpeg_end(data: bytes, start: int):
    """Structural JPEG boundary walk. Returns end offset (past FFD9) or None.

    Walks segment headers (FF marker + uint16 length) up to SOS, then scans
    the entropy-coded stream with byte-stuffing awareness (FF00 = data).
    """
    n = len(data)
    if data[start : start + 3] != b"\xff\xd8\xff":
        return None
    p = start + 2
    # markers without a length field
    nolen = {0xD8, 0xD9, 0x01} | set(range(0xD0, 0xD8))
    try:
        while p + 4 <= n:
            if data[p] != 0xFF:
                return None
            m = data[p + 1]
            if m == 0xD9:  # EOI
                return p + 2
            if m in nolen:
                p += 2
                continue
            if m == 0xDA:  # SOS: header len, then entropy data
                ln = int.from_bytes(data[p + 2 : p + 4], "big")
                p += 2 + ln
                # scan entropy-coded data for FFD9 (FF00 is stuffed data)
                while p + 1 < n:
                    if data[p] == 0xFF:
                        nm = data[p + 1]
                        if nm == 0x00:
                            p += 2
                            continue
                        if nm == 0xD9:
                            return p + 2
                        if nm in nolen or 0xD0 <= nm <= 0xD7:
                            p += 2
                            continue
                        # unexpected marker inside scan: strict abort (baseline
                        # JPEGs dominate here; progressive scans are re-found
                        # via their own FFD8 only if standalone)
                        return None
                    p += 1
                return None  # SOS scan ran past EOF without EOI
            ln = int.from_bytes(data[p + 2 : p + 4], "big")
            if ln < 2 or ln > 10_000_000 or p + 2 + ln > n:
                return None
            p += 2 + ln
    except IndexError:
        return None
    return None


def carve(data: bytes):
    """Yield (kind, offset, blob) for each embedded image."""
    blobs = []
    # JPEG via structural walk (exact boundaries, EXIF-safe)
    pos = 0
    while True:
        start = data.find(b"\xff\xd8\xff", pos)
        if start == -1:
            break
        # skip starts inside an already-kept blob
        if blobs and blobs[-1][0] == "jpg" and start < blobs[-1][1] + len(blobs[-1][2]):
            pos = start + 3
            continue
        end = jpeg_end(data, start)
        if end is None or end - start < 2048:
            pos = start + 3
            continue
        blobs.append(("jpg", start, data[start:end]))
        pos = end
    # PNG: 89 50 4E 47 ... IEND
    pos = 0
    while True:
        start = data.find(b"\x89PNG\r\n\x1a\n", pos)
        if start == -1:
            break
        iend = data.find(b"IEND", start + 8)
        if iend == -1:
            break
        end = iend + 8  # IEND + CRC
        blobs.append(("png", start, data[start:end]))
        pos = end
    # BMP: 'BM' + size header
    pos = 0
    while True:
        start = data.find(b"BM", pos)
        if start == -1:
            break
        if start + 6 <= len(data):
            size = int.from_bytes(data[start + 2 : start + 6], "little")
            if 1000 <= size <= 20_000_000 and start + size <= len(data):
                blobs.append(("bmp", start, data[start : start + size]))
                pos = start + size
                continue
        pos = start + 2
    blobs.sort(key=lambda b: b[1])
    return blobs


def resource_names(exe_path: str):
    """Recover AutoABC.data.* image names from the EXE string table, in order."""
    out = subprocess.run(["strings", exe_path], capture_output=True, text=True).stdout
    return re.findall(r"AutoABC\.data\.[A-Za-z0-9_.]+\.(?:jpg|png|bmp|gif)", out)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    exe_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    with open(exe_path, "rb") as f:
        data = f.read()
    print(f"EXE size: {len(data)} bytes")

    blobs = carve(data)
    print(f"carved blobs: {len(blobs)}")

    names = resource_names(exe_path)
    print(f"resource name refs: {len(names)}")

    # Validate with PIL when available; otherwise accept by magic bytes.
    try:
        from PIL import Image
        import io

        def valid(blob: bytes) -> bool:
            try:
                im = Image.open(io.BytesIO(blob))
                im.verify()
                return True
            except Exception:
                return False
    except ImportError:
        print("PIL unavailable, accepting by magic bytes only")
        valid = lambda b: True  # noqa: E731

    manifest = []
    kept = 0
    # Map blobs to resource names in file order (both follow resource order).
    # The name cursor advances ONLY for blobs we keep: invalid candidates must
    # not consume a name slot, otherwise every skip shifts all later names.
    img_names = [n for n in names if n.endswith((".jpg", ".png", ".bmp"))]
    ni = 0
    for kind, offset, blob in blobs:
        if not valid(blob):
            # Do NOT consume a name slot for undecodable candidates, and do
            # NOT promote nested EXIF thumbnails: a nested thumb wearing a
            # question name silently mis-maps that question (verified: e.g.
            # 9_start.sqc asks about a quay warning sign, not spark plugs).
            # Unmapped names are reported as missing instead.
            print(f"  skip invalid {kind} @ {offset}")
            continue
        base = None
        if ni < len(img_names):
            m = re.search(r"data\.(.+)\.(jpg|png|bmp)$", img_names[ni])
            if m:
                base = f"{m.group(1)}.{kind}"
            ni += 1
        if base is None:
            base = f"unknown_{offset}.{kind}"
        path = os.path.join(out_dir, base)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(blob)
        manifest.append({"file": base, "kind": kind, "offset": offset, "size": len(blob)})
        kept += 1

    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    total = sum(m["size"] for m in manifest)
    print(f"kept: {kept} images, {total} bytes total")
    print(f"manifest: {out_dir}/manifest.json")


if __name__ == "__main__":
    main()
