#!/usr/bin/env python3
"""ガチャの便器GLBを軽くする（元 11.7MB → 約 1MB）。

法線マップ(2048px・16bit)を外し、ベースカラーと金属・粗さのテクスチャを 1024px に縮める。
画像の縮小に macOS の sips を使う。

    python3 scripts/shrink-toilet-glb.py Toilet.glb apps/native/assets/gacha/toilet.glb
"""
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_TEXTURE_PX = 1024
NORMAL_MAP_IMAGE = "Toilet_NormalOGL16"
ALIGN = 4


def read_glb(path: Path):
    data = path.read_bytes()
    magic, _version, _length = struct.unpack("<4sII", data[:12])
    if magic != b"glTF":
        sys.exit(f"{path} は GLB ではありません")
    offset, doc, binary = 12, None, b""
    while offset < len(data):
        length, kind = struct.unpack("<I4s", data[offset : offset + 8])
        chunk = data[offset + 8 : offset + 8 + length]
        if kind == b"JSON":
            doc = json.loads(chunk.rstrip(b" \x00"))
        else:
            binary = chunk
        offset += 8 + length
    return doc, binary


def resize_png(png: bytes, workdir: Path, name: str) -> bytes:
    source, target = workdir / f"{name}.src.png", workdir / f"{name}.png"
    source.write_bytes(png)
    subprocess.run(["sips", "-Z", str(MAX_TEXTURE_PX), str(source), "--out", str(target)], check=True, capture_output=True)
    return target.read_bytes()


def pad(buffer: bytearray) -> None:
    while len(buffer) % ALIGN:
        buffer.append(0)


def main(src: Path, dst: Path) -> None:
    doc, binary = read_glb(src)
    names = [image["name"] for image in doc["images"]]
    if NORMAL_MAP_IMAGE not in names:
        sys.exit(f"想定した画像 {NORMAL_MAP_IMAGE} が見つかりません: {names}")

    keep = [i for i, name in enumerate(names) if name != NORMAL_MAP_IMAGE]
    dropped_view = doc["images"][names.index(NORMAL_MAP_IMAGE)]["bufferView"]
    views = doc["bufferViews"]

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        replaced = {}
        for i in keep:
            image = doc["images"][i]
            view = views[image["bufferView"]]
            start = view.get("byteOffset", 0)
            replaced[image["bufferView"]] = resize_png(binary[start : start + view["byteLength"]], workdir, f"image{i}")

        out, new_views = bytearray(), []
        for index, view in enumerate(views):
            if index == dropped_view:
                continue
            start = view.get("byteOffset", 0)
            payload = replaced.get(index, binary[start : start + view["byteLength"]])
            pad(out)
            new_view = dict(view, byteOffset=len(out), byteLength=len(payload))
            new_views.append((index, new_view))
            out += payload
        pad(out)

    # 外した bufferView 以降の番号が1つずつ前に詰まる
    renumber = {old: new for new, (old, _view) in enumerate(new_views)}
    doc["bufferViews"] = [view for _old, view in new_views]
    for accessor in doc["accessors"]:
        if "bufferView" in accessor:
            accessor["bufferView"] = renumber[accessor["bufferView"]]
    doc["images"] = [dict(doc["images"][i], bufferView=renumber[doc["images"][i]["bufferView"]]) for i in keep]

    # テクスチャは「画像番号」で参照するため、外した画像の分だけ詰め直す
    texture_of_image = {old: new for new, old in enumerate(keep)}
    normal_texture = next(i for i, texture in enumerate(doc["textures"]) if texture["source"] == names.index(NORMAL_MAP_IMAGE))
    kept_textures = [i for i in range(len(doc["textures"])) if i != normal_texture]
    texture_renumber = {old: new for new, old in enumerate(kept_textures)}
    doc["textures"] = [dict(doc["textures"][i], source=texture_of_image[doc["textures"][i]["source"]]) for i in kept_textures]
    for material in doc["materials"]:
        material.pop("normalTexture", None)
        pbr = material.get("pbrMetallicRoughness", {})
        for key in ("baseColorTexture", "metallicRoughnessTexture"):
            if key in pbr:
                pbr[key]["index"] = texture_renumber[pbr[key]["index"]]

    doc["buffers"][0]["byteLength"] = len(out)
    json_chunk = json.dumps(doc, separators=(",", ":")).encode()
    while len(json_chunk) % ALIGN:
        json_chunk += b" "
    total = 12 + 8 + len(json_chunk) + 8 + len(out)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(
        struct.pack("<4sII", b"glTF", 2, total)
        + struct.pack("<I4s", len(json_chunk), b"JSON")
        + json_chunk
        + struct.pack("<I4s", len(out), b"BIN\x00")
        + bytes(out)
    )
    print(f"{src} ({src.stat().st_size:,} bytes) -> {dst} ({dst.stat().st_size:,} bytes)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
