"""head_acc_hat-*.glb のプレビューをレンダリングする。

poopm_base.glb を読み込み、各アクセサリを head_acc ソケットのレスト位置
(0, 0, HEAD_ACC_Z) に置いて正面・斜めのスチルを out/ へ書き出す。
形状確認用で、GLB 自体の生成は build_head_acc.py が行う。

    /Applications/Blender.app/Contents/MacOS/Blender --background \\
        --python scripts/poopm-3d/render_head_acc_preview.py
"""

import math
import os

import bpy
from mathutils import Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSET_DIR = os.path.join(REPO, "public", "assets", "poopm_3d")
OUT_DIR = os.path.join(REPO, "scripts", "poopm-3d", "out")

ACC_IDS = ["hat-a", "hat-b", "hat-c", "hat-d", "hat-e", "hat-f"]


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def head_top():
    """body メッシュの頂点（カール先端）のワールド z を返す。"""
    rig = next(
        o for o in bpy.data.objects
        if o.type == "ARMATURE" and any(c.type == "MESH" for c in o.children)
    )
    # 残骸リグ・孤立メッシュがレンダーに写り込まないよう隠す
    for o in bpy.data.objects:
        if o is not rig and o.parent is not rig and o not in rig.children:
            o.hide_render = True
    body = next(c for c in rig.children if c.name == "body")
    return max((body.matrix_world @ Vector(c)).z for c in body.bound_box)


def seat_for(acc_id, top):
    """プレビュー用の座面。被せ物は先端を包む位置、立ち物は先端の脇。

    現行 GLB には稼働中の head_acc ソケットが無い（残骸リグに付いたまま）ため、
    実行時の取り付け位置はソケット整備側の責務。ここでは見た目確認用の代表位置。
    """
    if acc_id in ("hat-a", "hat-f"):  # 新芽・花は先端の後ろ側に立てる
        return Vector((0, 0.02, top - 0.045))
    return Vector((0.02, -0.015, top - 0.055))  # 被せ物は前に倒れた先端ごと包む


def roots(objs):
    names = {o.name for o in objs}
    return [o for o in objs if o.parent is None or o.parent.name not in names]


def add_camera(name, loc, look_at, ortho=0.55):
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = ortho
    cam = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return cam


def setup_render():
    scene = bpy.context.scene
    engines = [i.identifier for i in scene.render.bl_rna.properties["engine"].enum_items]
    scene.render.engine = next(
        (e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH") if e in engines),
        engines[0],
    )
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    world = bpy.data.worlds.new("preview_world")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.92, 0.92, 0.92, 1.0)
    bg.inputs[1].default_value = 1.0
    scene.world = world
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), math.radians(-15), 0)
    bpy.context.scene.collection.objects.link(sun)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    reset_scene()
    import_glb(os.path.join(ASSET_DIR, "poopm_base.glb"))
    setup_render()
    scene = bpy.context.scene
    top = head_top()
    print(f"head top: {top:.4f}")

    target = Vector((0, 0, top - 0.15))
    views = {
        "front": (target + Vector((0, -1.0, 0)), target),
        "angle": (target + Vector((-0.7, -0.8, 0.2)), target),
    }

    for acc_id in ACC_IDS:
        added = import_glb(os.path.join(ASSET_DIR, f"head_acc_{acc_id}.glb"))
        seat = seat_for(acc_id, top)
        for obj in roots(added):
            obj.location += seat
        bpy.context.view_layer.update()
        for tag, (loc, look) in views.items():
            scene.camera = add_camera(f"cam_{acc_id}_{tag}", loc, look)
            scene.render.filepath = os.path.join(OUT_DIR, f"head_acc_{acc_id}_{tag}.png")
            bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(scene.camera)
        for obj in added:
            bpy.data.objects.remove(obj)
        print(f"rendered {acc_id}")


if __name__ == "__main__":
    main()
