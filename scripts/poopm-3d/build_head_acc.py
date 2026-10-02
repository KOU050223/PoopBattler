"""うんちくん 3D 頭アクセサリ (head_acc_hat-*.glb) を生成する。

仕様は docs/poopm-3d.md「バリアント追加の手順」。実行時にベースモデルの
`head_acc` ノード（`b_head_acc` ソケット配下）へアタッチされる前提で、
**原点 = 最上段ローブの接地点、-Y が正面**としてモデリングする。

    /Applications/Blender.app/Contents/MacOS/Blender --background \\
        --python scripts/poopm-3d/build_head_acc.py
"""

import math
import os

import bpy
from mathutils import Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(REPO, "public", "assets", "poopm_3d")

# 実行時の取り付け位置はソケット側が持つため、原点=接地点として中央に作る。
# 現行の poopm_base.glb は先端が前（-Y）へカールしたコーン型で、被せ物は
# 先端を包み込む前提のサイズにしてある。


# ---------------------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def srgb(hex_str):
    """'#rrggbb' を linear の (r, g, b, 1) に変換する。"""
    v = [int(hex_str[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v) + (1.0,)


def make_material(name, hex_color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = srgb(hex_color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def link_obj(name, mesh, mat=None):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def _prim(op, name, mat, location, scale=None, rotation=None, **kw):
    op(location=location, **kw)
    obj = bpy.context.object
    obj.name = name
    if scale:
        obj.scale = scale
    if rotation:
        obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def sphere(name, mat, location, scale=(1, 1, 1), rotation=None):
    obj = _prim(
        bpy.ops.mesh.primitive_uv_sphere_add,
        name, mat, location, scale, rotation,
        segments=32, ring_count=16,
    )
    smooth(obj)
    return obj


def ico(name, mat, location, radius):
    obj = _prim(
        bpy.ops.mesh.primitive_ico_sphere_add,
        name, mat, location, None, None,
        radius=radius, subdivisions=2,
    )
    smooth(obj)
    return obj


def cylinder(name, mat, location, radius, depth, rotation=None):
    obj = _prim(
        bpy.ops.mesh.primitive_cylinder_add,
        name, mat, location, None, rotation,
        radius=radius, depth=depth, vertices=32,
    )
    smooth(obj)
    return obj


def cone(name, mat, location, radius, depth, rotation=None):
    obj = _prim(
        bpy.ops.mesh.primitive_cone_add,
        name, mat, location, None, rotation,
        radius1=radius, radius2=0.0, depth=depth, vertices=24,
    )
    smooth(obj)
    return obj


def torus(name, mat, location, major_radius, minor_radius, rotation=None):
    obj = _prim(
        bpy.ops.mesh.primitive_torus_add,
        name, mat, location, None, rotation,
        major_radius=major_radius, minor_radius=minor_radius,
        major_segments=40, minor_segments=12,
    )
    smooth(obj)
    return obj


def lathe(name, profile, mat, location, segments=40):
    """profile = [(radius, z), ...] を下端から上端の順でZ軸まわりに回転させる。"""
    n = len(profile)
    verts = []
    faces = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        ca, sa = math.cos(a), math.sin(a)
        verts += [(r * ca, r * sa, z) for r, z in profile]
    for i in range(segments):
        ni = (i + 1) % segments
        for j in range(n - 1):
            faces.append((i * n + j, ni * n + j, ni * n + j + 1, i * n + j + 1))
    # 底面キャップ
    faces.append(tuple(i * n for i in reversed(range(segments))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = link_obj(name, mesh, mat)
    obj.location = location
    smooth(obj)
    return obj


def half_dome(name, radius, height, mat, location, rings=10):
    """下半分を切った楕円ドーム。底は z=0。"""
    profile = [
        (max(radius * math.cos(t), 0.0008), height * math.sin(t))
        for t in (math.pi / 2 * k / rings for k in range(rings + 1))
    ]
    return lathe(name, profile, mat, location)


def text_mesh(name, body, mat, location, size, rotation, extrude=0.0015):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


# ---------------------------------------------------------------------------
# アクセサリ
# ---------------------------------------------------------------------------


def build_hat_a():
    """新芽: 短い茎に1枚の葉。"""
    stem = make_material("acc_stem", "#5d9a44", 0.6)
    leaf = make_material("acc_leaf", "#7cb350", 0.55)
    cylinder("sprout_stem", stem, (0, 0, 0.022), 0.006, 0.05,
             rotation=(math.radians(-8), math.radians(10), 0))
    # 葉は茎の先から前上へ伸びる楕円
    sphere("sprout_leaf", leaf, (0.006, -0.012, 0.055),
           scale=(0.016, 0.036, 0.006),
           rotation=(math.radians(55), 0, math.radians(-15)))


def build_hat_b():
    """王冠: 金の輪に5本の突起と先端玉、前面に赤い宝玉。"""
    gold = make_material("acc_gold", "#f2b01e", 0.3, metallic=0.7)
    jewel = make_material("acc_jewel", "#d23b3b", 0.35)
    cylinder("crown_band", gold, (0, 0, 0.016), 0.068, 0.032)
    for i in range(5):
        a = 2 * math.pi * i / 5
        x, y = 0.062 * math.cos(a), 0.062 * math.sin(a)
        cone(f"crown_spike_{i}", gold, (x, y, 0.046), 0.018, 0.034)
        ico(f"crown_tip_{i}", gold, (x, y, 0.066), 0.008)
    sphere("crown_jewel", jewel, (0, -0.068, 0.018), scale=(0.012, 0.008, 0.014))


def build_hat_c():
    """野球帽: 青いドーム + 赤いツバ + 前面の白い P。"""
    blue = make_material("acc_cap_blue", "#3f6fd1", 0.5)
    red = make_material("acc_cap_red", "#d64545", 0.5)
    white = make_material("acc_white", "#f5f5f5", 0.5)
    half_dome("cap_dome", 0.080, 0.066, blue, (0, 0, 0))
    sphere("cap_brim", red, (0, -0.078, 0.006), scale=(0.058, 0.052, 0.007))
    sphere("cap_button", blue, (0, 0, 0.068), scale=(0.012, 0.012, 0.008))
    # ドーム前面（z=0.036 では面は y≈-0.069）から少し浮かせて貼る
    text_mesh("cap_logo", "P", white, (0, -0.073, 0.036), 0.042,
              rotation=(math.radians(90), 0, 0))


def build_hat_d():
    """ニット帽: 赤いドーム + 折り返しの帯 + ポンポン。"""
    red = make_material("acc_knit", "#d64545", 0.65)
    dark = make_material("acc_knit_fold", "#a83232", 0.65)
    pink = make_material("acc_pompom", "#f0a0a8", 0.7)
    half_dome("beanie_dome", 0.082, 0.064, red, (0, 0, 0.006))
    torus("beanie_fold", dark, (0, 0, 0.014), 0.076, 0.015)
    ico("beanie_pompom", pink, (0, 0, 0.086), 0.026)


def build_hat_e():
    """ゴーグル: グレーのストラップを斜めに回し、前面にティールのレンズ。"""
    strap = make_material("acc_strap", "#4e545e", 0.6)
    lens = make_material("acc_lens", "#5fb8b8", 0.2, metallic=0.4)
    frame = make_material("acc_frame", "#3a3f47", 0.55)
    tilt = math.radians(10)
    torus("goggle_strap", strap, (0, 0, 0.040), 0.082, 0.010, rotation=(tilt, 0, 0))
    sphere("goggle_lens", lens, (0, -0.080, 0.032), scale=(0.062, 0.018, 0.026))
    torus("goggle_frame", frame, (0, -0.080, 0.032), 0.052, 0.007,
          rotation=(math.radians(90), 0, 0))


def build_hat_f():
    """デイジー: 緑の茎 + 黄色い花心 + 白い8枚の花弁。"""
    stem = make_material("acc_stem", "#5d9a44", 0.6)
    petal = make_material("acc_petal", "#fbfbf6", 0.55)
    core = make_material("acc_core", "#f2b622", 0.5)
    cylinder("flower_stem", stem, (0, 0, 0.026), 0.005, 0.056,
             rotation=(math.radians(-6), math.radians(-6), 0))
    head = Vector((-0.006, -0.004, 0.058))
    tilt = math.radians(12)  # 花心を少し前（-Y）へ向ける
    sphere("flower_core", core, head, scale=(0.019, 0.010, 0.019),
           rotation=(tilt, 0, 0))
    for i in range(8):
        a = 2 * math.pi * i / 8
        dx, dz = math.cos(a), math.sin(a)
        sphere(
            f"flower_petal_{i}", petal,
            head + Vector((dx * 0.026, -0.004, dz * 0.026)),
            scale=(0.011, 0.006, 0.026),
            rotation=(tilt, -a, 0),
        )
    sphere("flower_leaf", stem, (0.014, 0.002, 0.022),
           scale=(0.010, 0.024, 0.005),
           rotation=(math.radians(50), 0, math.radians(-30)))


BUILDERS = {
    "hat-a": build_hat_a,
    "hat-b": build_hat_b,
    "hat-c": build_hat_c,
    "hat-d": build_hat_d,
    "hat-e": build_hat_e,
    "hat-f": build_hat_f,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for acc_id, build in BUILDERS.items():
        reset_scene()
        build()
        path = os.path.join(OUT_DIR, f"head_acc_{acc_id}.glb")
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_animations=False,
            export_skins=False,
            export_cameras=False,
            export_lights=False,
        )
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
