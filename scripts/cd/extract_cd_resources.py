#!/usr/bin/env python3
"""Extract AutoABC.data.* images from the ABC Auto EXE via .NET .resources parsing.

Why not marker-carving (see scripts/extract_cd_images.py): .resources stores
names in hash order, not data order, so blob order != name order and ~100 of
the 518 question images get misnamed or lost. This parser reads the real
name -> data-offset map from each .resources section header, giving exact
CD question-ID mapping (e.g. 936_start.jpg <-> DB nume_poza '936_start.sqc').

Usage: python3 scripts/extract_cd_resources.py <exe_path> <out_dir>
"""

import os
import struct
import sys


def read_7bit(data: bytes, pos: int):
    result, shift = 0, 0
    while True:
        b = data[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, pos
        shift += 7


def read_str(data: bytes, pos: int):
    n, pos = read_7bit(data, pos)
    return data[pos : pos + n].decode("utf-8"), pos + n


def parse_resources(blob: bytes):
    """Return {name: (typecode, value_bytes)} for one .resources section."""
    pos = 0
    magic, hver, skip = struct.unpack_from("<3I", blob, pos)
    assert magic == 0xBEEFCACE, f"bad magic {magic:#x}"
    # NumBytesToSkip jumps past the reader/resource-set version preamble;
    # NumResources follows 4 bytes later (observed: counts at 12+skip+4,
    # validated by clean type-name parse).
    pos = 12 + skip + 4
    num_res, num_types = struct.unpack_from("<2i", blob, pos)
    pos += 8
    for _ in range(num_types):
        _, pos = read_str(blob, pos)
    pos = (pos + 7) & ~7  # 8-byte align
    hashes = struct.unpack_from(f"<{num_res}i", blob, pos)
    pos += 4 * num_res
    name_pos = struct.unpack_from(f"<{num_res}i", blob, pos)
    pos += 4 * num_res
    data_offset = struct.unpack_from("<i", blob, pos)[0]
    # names
    names = {}
    for np in name_pos:
        p = np
        nlen, p = read_7bit(blob, p)
        name = blob[p : p + nlen].decode("utf-8")
        p += nlen
        doff, _ = read_7bit(blob, p)
        names[name] = doff
    # data values: sort by offset to bound each entry
    by_off = sorted(names.items(), key=lambda kv: kv[1])
    out = {}
    for idx, (name, doff) in enumerate(by_off):
        p = data_offset + doff
        tcode, p = read_7bit(blob, p)
        end = data_offset + by_off[idx + 1][1] if idx + 1 < len(by_off) else len(blob)
        out[name] = (tcode, blob[p:end])
    return out


def unwrap_image(tcode: int, payload: bytes):
    """Return (ext, raw_bytes) or None."""
    if tcode == 32:  # ByteArray: 7-bit len + bytes
        n, p = read_7bit(payload, 0)
        raw = payload[p : p + n]
    elif tcode == 33:  # Stream: same layout
        n, p = read_7bit(payload, 0)
        raw = payload[p : p + n]
    else:  # serialized Bitmap etc: carve image magic inside payload
        raw = payload
    for magic, ext in (
        (b"\xff\xd8\xff", "jpg"),
        (b"\x89PNG\r\n\x1a\n", "png"),
        (b"BM", "bmp"),
        (b"GIF8", "gif"),
    ):
        i = raw.find(magic)
        if i != -1:
            blob = raw[i:]
            if ext == "jpg":
                j = blob.find(b"\xff\xd9")
                if j != -1:
                    blob = blob[: j + 2]
            elif ext == "png":
                j = blob.find(b"IEND")
                if j != -1:
                    blob = blob[: j + 8]
            return ext, blob
    return None


def main():
    exe_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    data = open(exe_path, "rb").read()

    sections = []
    p = 0
    while True:
        i = data.find(b"\xce\xca\xef\xbe", p)
        if i == -1:
            break
        sections.append(i)
        p = i + 1
    print(f".resources sections: {len(sections)}")

    try:
        from PIL import Image
        import io

        def valid(b: bytes) -> bool:
            try:
                im = Image.open(io.BytesIO(b))
                im.verify()
                return True
            except Exception:
                return False
    except ImportError:
        valid = lambda b: True  # noqa: E731

    saved, skipped = 0, []
    for s in sections:
        try:
            entries = parse_resources(data[s:])
        except Exception as e:
            print(f"  section @{s}: parse failed ({e}), skipping")
            continue
        hits = {n: v for n, v in entries.items() if n.startswith("AutoABC.data.")}
        print(f"  section @{s}: {len(entries)} resources, {len(hits)} AutoABC.data.*")
        for name, (tcode, payload) in hits.items():
            short = name[len("AutoABC.data.") :]
            got = unwrap_image(tcode, payload)
            if got is None or not valid(got[1]):
                skipped.append(name)
                continue
            ext, raw = got
            base = short.rsplit(".", 1)[0] + "." + ext
            path = os.path.join(out_dir, base)
            if not os.path.exists(path):
                with open(path, "wb") as f:
                    f.write(raw)
            saved += 1
    print(f"saved: {saved}, skipped: {len(skipped)}")
    for n in skipped[:20]:
        print("  skip:", n)


if __name__ == "__main__":
    main()
