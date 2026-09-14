#!/usr/bin/env python3
"""Extract embedded manifest files from the ABC Auto .NET 2.0 assembly.

Background: the 658 `AutoABC.data.*` images are NOT .resources entries but
.NET *manifest* resources (one embedded file per image, e.g. question art
`AutoABC.data.936_start.jpg` <-> DB `nume_poza='936_start.sqc'`). Marker
carving (extract_cd_images.py) recovers the bytes but mis-maps ~100 of the
518 question images because blob order != name order. This script parses the
PE + CLI metadata (#~ ManifestResource table) for the exact name -> offset
map, then slices each length-prefixed blob. Deterministic: 518/518 expected.

Usage: python3 scripts/extract_cli_resources.py <exe_path> <out_dir>
"""

import os
import struct
import sys

# ECMA-335 table row schemas as (name, [(col, kind)]) where kind is:
#  i16/i32/u16/u32 = fixed; s/g/b = string/guid/blob heap index (2 or 4 bytes
#  per heapsizes); cXX = coded index with XX tag bits.
TABLES = [
    ("Module", [("Generation", "u16"), ("Name", "s"), ("Mvid", "g"), ("EncId", "g"), ("EncBaseId", "g")]),
    ("TypeRef", [("ResolutionScope", "c0"), ("TypeName", "s"), ("TypeNamespace", "s")]),
    ("TypeDef", [("Flags", "u32"), ("TypeName", "s"), ("TypeNamespace", "s"), ("Extends", "c1"), ("FieldList", "t04"), ("MethodList", "t05")]),
    ("FieldPtr", [("Field", "t04")]),
    ("Field", [("Flags", "u16"), ("Name", "s"), ("Signature", "b")]),
    ("MethodPtr", [("Method", "t05")]),
    ("MethodDef", [("RVA", "u32"), ("ImplFlags", "u16"), ("Flags", "u16"), ("Name", "s"), ("Signature", "b"), ("ParamList", "t08")]),
    ("ParamPtr", [("Param", "t08")]),
    ("Param", [("Flags", "u16"), ("Sequence", "u16"), ("Name", "s")]),
    ("InterfaceImpl", [("Class", "t02"), ("Interface", "c1")]),
    ("MemberRef", [("Class", "c2"), ("Name", "s"), ("Signature", "b")]),
    ("Constant", [("Type", "u16"), ("Parent", "c3"), ("Value", "b")]),
    ("CustomAttribute", [("Parent", "c4"), ("Type", "c5"), ("Value", "b")]),
    ("FieldMarshal", [("Parent", "c6"), ("NativeType", "b")]),
    ("DeclSecurity", [("Action", "u16"), ("Parent", "c7"), ("PermissionSet", "b")]),
    ("ClassLayout", [("PackingSize", "u16"), ("ClassSize", "u32"), ("Parent", "t02")]),
    ("FieldLayout", [("Offset", "u32"), ("Field", "t04")]),
    ("StandAloneSig", [("Signature", "b")]),
    ("EventMap", [("Parent", "t02"), ("EventList", "t14")]),
    ("EventPtr", [("Event", "t14")]),
    ("Event", [("EventFlags", "u16"), ("Name", "s"), ("EventType", "c1")]),
    ("PropertyMap", [("Parent", "t02"), ("PropertyList", "t17")]),
    ("PropertyPtr", [("Property", "t17")]),
    ("Property", [("Flags", "u16"), ("Name", "s"), ("Type", "b")]),
    ("MethodSemantics", [("Semantics", "u16"), ("Method", "t05"), ("Association", "c8")]),
    ("MethodImpl", [("Class", "t02"), ("MethodBody", "c9"), ("MethodDeclaration", "c9")]),
    ("ModuleRef", [("Name", "s")]),
    ("TypeSpec", [("Signature", "b")]),
    ("ImplMap", [("MappingFlags", "u16"), ("MemberForwarded", "c10"), ("ImportName", "s"), ("ImportScope", "t1a")]),
    ("FieldRVA", [("RVA", "u32"), ("Field", "t04")]),
    ("ENCLog", [("Token", "u32"), ("FuncCode", "u32")]),
    ("ENCMap", [("Token", "u32")]),
    ("Assembly", [("HashAlgId", "u32"), ("Major", "u16"), ("Minor", "u16"), ("Build", "u16"), ("Revision", "u16"), ("Flags", "u32"), ("PublicKey", "b"), ("Name", "s"), ("Culture", "s")]),
    ("AssemblyProcessor", [("Processor", "u32")]),
    ("AssemblyOS", [("OSPlatformId", "u32"), ("OSMajor", "u32"), ("OSMinor", "u32")]),
    ("AssemblyRef", [("Major", "u16"), ("Minor", "u16"), ("Build", "u16"), ("Revision", "u16"), ("Flags", "u32"), ("PublicKeyOrToken", "b"), ("Name", "s"), ("Culture", "s"), ("HashValue", "b")]),
    ("AssemblyRefProcessor", [("Processor", "u32"), ("AssemblyRef", "t24")]),
    ("AssemblyRefOS", [("OSPlatformId", "u32"), ("OSMajor", "u32"), ("OSMinor", "u32"), ("AssemblyRef", "t24")]),
    ("File", [("Flags", "u32"), ("Name", "s"), ("HashValue", "b")]),
    ("ExportedType", [("Flags", "u32"), ("TypeDefId", "u32"), ("TypeName", "s"), ("TypeNamespace", "s"), ("Implementation", "c11")]),
    ("ManifestResource", [("Offset", "u32"), ("Flags", "u32"), ("Name", "s"), ("Implementation", "c12")]),
    ("NestedClass", [("NestedClass", "t02"), ("EnclosingClass", "t02")]),
    ("GenericParam", [("Number", "u16"), ("Flags", "u16"), ("Owner", "c13"), ("Name", "s")]),
    ("MethodSpec", [("Method", "c9"), ("Instantiation", "b")]),
    ("GenericParamConstraint", [("Owner", "t2c"), ("Constraint", "c1")]),
]
# coded index (tagbits, tables)
CODED = {
    "c0": (2, [2, 27, 35, 38]), "c1": (2, [2, 27, 35]),
    "c2": (3, [2, 27, 35, 1, 36]), "c3": (2, [4, 8, 23]),
    "c4": (5, [2, 4, 5, 6, 8, 9, 10, 13, 14, 17, 20, 22, 26, 27, 28, 31, 33, 34, 35, 36, 39]),
    "c5": (3, [2, 27, 10, 27, 6]),
    "c6": (1, [4, 8]), "c7": (2, [2, 6, 32]),
    "c8": (1, [14, 20, 23]), "c9": (1, [6, 10]),
    "c10": (1, [4, 6]), "c11": (2, [26, 27, 35]),
    "c12": (2, [26, 35, 39]), "c13": (2, [2, 6, 27]),
}
# table simple-index refs tNN (index into table NN, 2 or 4 bytes by row count)
TABLEREF_BITS = {"t02": 2, "t04": 4, "t05": 5, "t08": 8, "t14": 20, "t17": 23, "t1a": 26, "t24": 36, "t2c": 44}


def col_size(kind, ctx):
    if kind in ("u16", "i16"):
        return 2
    if kind in ("u32", "i32"):
        return 4
    if kind == "s":
        return 4 if ctx["big_s"] else 2
    if kind == "g":
        return 4 if ctx["big_g"] else 2
    if kind == "b":
        return 4 if ctx["big_b"] else 2
    if kind.startswith("c"):
        tagbits, tabs = CODED[kind]
        mx = max(ctx["rows"][t] for t in tabs)
        return 4 if mx >= (1 << (16 - tagbits)) else 2
    if kind.startswith("t"):
        return 4 if ctx["rows"][TABLEREF_BITS[kind]] >= 65536 else 2
    raise ValueError(kind)


def rva_to_off(sections, rva):
    for vaddr, vsize, raw, ptr in sections:
        if vaddr <= rva < vaddr + max(vsize, raw):
            return ptr + (rva - vaddr)
    raise ValueError(f"rva {rva:#x} not in sections")


def parse_manifest_resources(exe: bytes):
    e_lfanew = struct.unpack_from("<I", exe, 0x3C)[0]
    assert exe[e_lfanew : e_lfanew + 4] == b"PE\x00\x00"
    coff = e_lfanew + 4
    nsec = struct.unpack_from("<H", exe, coff + 2)[0]
    opt = coff + 20
    magic = struct.unpack_from("<H", exe, opt)[0]
    assert magic == 0x10B, f"not PE32: {magic:#x}"
    dd_off = opt + 96  # data directories (PE32)
    cli_rva, _ = struct.unpack_from("<2I", exe, dd_off + 14 * 8)
    sh_off = opt + 224
    sections = []
    for i in range(nsec):
        vsize, vaddr, raw, ptr = struct.unpack_from("<4I", exe, sh_off + i * 40 + 8)
        sections.append((vaddr, vsize, raw, ptr))
    cli = rva_to_off(sections, cli_rva)
    (md_rva,) = struct.unpack_from("<I", exe, cli + 8)
    md = rva_to_off(sections, md_rva)
    assert exe[md : md + 4] == b"BSJB"
    ver_len = struct.unpack_from("<I", exe, md + 12)[0]
    p = md + 16 + ver_len
    p = (p + 3) & ~3  # align
    flags, nstreams = struct.unpack_from("<2H", exe, p)
    p += 4
    streams = {}
    for _ in range(nstreams):
        offset, size = struct.unpack_from("<2I", exe, p)
        p += 8
        name = exe[p : exe.index(b"\x00", p)].decode()
        p = (p + len(name) + 1 + 3) & ~3
        streams[name] = (md + offset, size)
    tilde, _ = streams["#~"]
    s_off, s_size = streams["#Strings"]
    heap = exe[s_off : s_off + s_size]

    def get_str(idx):
        end = heap.index(b"\x00", idx)
        return heap[idx:end].decode("utf-8")

    p = tilde
    p += 4 + 2 + 2  # reserved, major, minor
    heapsizes = exe[p]
    p += 1 + 1  # heapsizes, reserved
    valid, sortedm = struct.unpack_from("<2Q", exe, p)
    p += 16
    rows = {}
    for i in range(64):
        if valid >> i & 1:
            (n,) = struct.unpack_from("<I", exe, p)
            p += 4
            rows[i] = n
    ctx = {
        "rows": {i: rows.get(i, 0) for i in range(64)},
        "big_s": bool(heapsizes & 1),
        "big_g": bool(heapsizes & 2),
        "big_b": bool(heapsizes & 4),
    }
    tables = {}
    for i, (tname, cols) in enumerate(TABLES):
        if not (valid >> i & 1):
            continue
        rsize = sum(col_size(k, ctx) for _, k in cols)
        recs = []
        for _ in range(rows[i]):
            rec = {}
            for cname, k in cols:
                sz = col_size(k, ctx)
                rec[cname] = int.from_bytes(exe[p : p + sz], "little")
                p += sz
            recs.append(rec)
        tables[tname] = recs

    man = tables.get("ManifestResource", [])
    out = []
    for r in man:
        impl_kind = r["Implementation"] & 3
        out.append(
            {
                "offset": r["Offset"],
                "flags": r["Flags"],
                "name": get_str(r["Name"]),
                "impl": (impl_kind, r["Implementation"] >> 2),
            }
        )
    return sections, out


def main():
    exe_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    data = open(exe_path, "rb").read()
    sections, man = parse_manifest_resources(data)
    print(f"manifest resources: {len(man)}")
    data_rows = [r for r in man if r["name"].startswith("AutoABC.data.")]
    print(f"AutoABC.data.*: {len(data_rows)}")
    for r in man[:5]:
        print("  ", hex(r["offset"]), r["name"][:60], r["impl"])

    # Locate the embedded-file base: blobs are u32 length + data. The first
    # row (by offset) should decode cleanly from base+offset.
    by_off = sorted(data_rows, key=lambda r: r["offset"])
    cands = []
    for vaddr, vsize, raw, ptr in sections:
        cands.append(ptr)  # section raw starts
    base = None
    for b in cands:
        off = by_off[0]["offset"]
        ln = int.from_bytes(data[b + off : b + off + 4], "little")
        blob = data[b + off + 4 : b + off + 4 + 64]
        if 1000 < ln < 20_000_000 and (
            blob.startswith(b"\xff\xd8\xff") or blob.startswith(b"\x89PNG")
        ):
            base = b
            break
    if base is None:  # brute force: magic scan for plausible base
        for b in range(0, len(data) - 4, 0x200):
            off = by_off[0]["offset"]
            if b + off + 8 > len(data):
                break
            ln = int.from_bytes(data[b + off : b + off + 4], "little")
            blob = data[b + off + 4 : b + off + 4 + 4]
            if 1000 < ln < 20_000_000 and (
                blob.startswith(b"\xff\xd8\xff") or blob.startswith(b"\x89PNG")
            ):
                base = b
                break
    print("resource base:", hex(base) if base is not None else None)
    if base is None:
        print("FAIL: could not locate embedded-file base")
        return 1

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

    saved, bad = 0, []
    for r in data_rows:
        off = base + r["offset"]
        ln = int.from_bytes(data[off : off + 4], "little")
        blob = data[off + 4 : off + 4 + ln]
        short = r["name"][len("AutoABC.data.") :]
        if not (100 < ln < 30_000_000 and valid(blob)):
            bad.append(r["name"])
            continue
        ext = short.rsplit(".", 1)[-1]
        if ext not in ("jpg", "png", "bmp", "gif"):
            ext = "bin"
            short += ".bin"
        path = os.path.join(out_dir, short.rsplit(".", 1)[0] + "." + ext)
        with open(path, "wb") as f:
            f.write(blob)
        saved += 1
    print(f"saved: {saved}, bad: {len(bad)}")
    for n in bad[:20]:
        print("  bad:", n)


if __name__ == "__main__":
    main()
