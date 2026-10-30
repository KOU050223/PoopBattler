"""同梱の poopm_base.glb に走りクリップ "run" を足して書き出す（レース用、Issue #266）。

build_poopm_base.py は同梱 GLB と別のリグ・クリップ構成になっていて再生成できない
（ko / win / special_* などが出ない）。そのため同梱 GLB を読み込み、run だけを足す。
すでに run がある GLB に対しては、作り直して置き換える（何度流しても同じ結果）。

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python scripts/poopm-3d/add_run_clip.py

    # 見た目の確認（横から4コマを /tmp などへ書き出す）
    PREVIEW_DIR=/path/to/dir /Applications/Blender.app/... --python scripts/poopm-3d/add_run_clip.py

Blender 側は Z-up / -Y 正面。腕のボーンは +X/-X へ水平に伸びている（左 = +X）。
"""

import math
import os

import bpy
from mathutils import Quaternion, Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GLB_PATHS = [
    os.path.join(REPO, "apps", "native", "assets", "poopm_3d", "poopm_base.glb"),
    os.path.join(REPO, "apps", "web", "public", "assets", "poopm_3d", "poopm_base.glb"),
]
PREVIEW_DIR = os.environ.get("PREVIEW_DIR")

CLIP_NAME = "run"
# 1周 16 コマ（24fps で 0.67 秒）。最後のコマは最初と同じポーズ（ループの継ぎ目）
CYCLE_FRAMES = 16

X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)

# 前のめり。脚は b_body1 の子なので、b_body1 を倒すと脚が後ろへ振られる。
# 足元が軸の b_root で倒す
LEAN_DEG = 8

# 動かすボーン。clip 内でキーを打つ対象を揃えて、ループで補間が抜けないようにする
KEYED_BONES = [
    "b_root", "b_body1", "b_body2",
    "b_upperarm_L", "b_upperarm_R", "b_forearm_L", "b_forearm_R",
    "b_thigh_L", "b_thigh_R", "b_shin_L", "b_shin_R", "b_foot_L", "b_foot_R",
]  # fmt: skip


def world_rot(rig, bone_name, axis, degrees):
    """ワールド軸まわりの回転を、ボーンのレスト空間のクォータニオンに直す。"""
    rest = rig.data.bones[bone_name].matrix_local.to_3x3()
    local_axis = (rest.inverted() @ Vector(axis)).normalized()
    return Quaternion(local_axis, math.radians(degrees))


def key_pose(rig, frame, rotations, scales=None, locations=None):
    """rotations: {bone: [(world_axis, deg), ...]}。書いていないボーンはレストに戻す。"""
    pbs = rig.pose.bones
    for pb in pbs:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
        pb.location = (0, 0, 0)
    for name, rots in rotations.items():
        q = Quaternion()
        for axis, deg in rots:
            q = world_rot(rig, name, axis, deg) @ q
        pbs[name].rotation_quaternion = q
    for name, s in (scales or {}).items():
        pbs[name].scale = s
    for name, loc in (locations or {}).items():
        rest = rig.data.bones[name].matrix_local.to_3x3()
        pbs[name].location = rest.inverted() @ Vector(loc)
    for name in KEYED_BONES:
        pb = pbs[name]
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("scale", frame=frame)
        pb.keyframe_insert("location", frame=frame)


def stride(sign):
    """sign=+1 で左足が前。腿は X 軸で振る（+X で後ろ、-X で前）。

    腕は足と逆に振る。腕のボーンは水平なので前後は Z 軸まわり
    （左腕は -Z で前、右腕は +Z で前）。
    """
    front, back = (-1, 1) if sign > 0 else (1, -1)
    left_front = sign > 0
    return {
        "b_thigh_L": [(X, -48 if left_front else 40)],
        "b_thigh_R": [(X, 40 if left_front else -48)],
        "b_shin_L": [(X, 18 if left_front else 70)],
        "b_shin_R": [(X, 70 if left_front else 18)],
        "b_foot_L": [(X, 0 if left_front else -25)],
        "b_foot_R": [(X, -25 if left_front else 0)],
        "b_upperarm_L": [(Z, 38 * sign), (Y, 28)],
        "b_upperarm_R": [(Z, 38 * sign), (Y, -28)],
        "b_forearm_L": [(Z, -30 if left_front else -10)],
        "b_forearm_R": [(Z, 10 if left_front else 30)],
        "b_root": [(X, LEAN_DEG)],
        "b_body1": [(Z, -6 * sign)],
        "b_body2": [(X, 6), (Z, 5 * sign)],
    }


def passing(sign):
    """足が体の下を通る瞬間。軸足が伸び、反対の足が畳まれて前へ出てくる。"""
    left_support = sign > 0
    return {
        "b_thigh_L": [(X, 5 if left_support else -10)],
        "b_thigh_R": [(X, -10 if left_support else 5)],
        "b_shin_L": [(X, 8 if left_support else 85)],
        "b_shin_R": [(X, 85 if left_support else 8)],
        "b_foot_L": [(X, 0 if left_support else -30)],
        "b_foot_R": [(X, -30 if left_support else 0)],
        "b_upperarm_L": [(Y, 28)],
        "b_upperarm_R": [(Y, -28)],
        "b_forearm_L": [(Z, -20)],
        "b_forearm_R": [(Z, 20)],
        "b_root": [(X, LEAN_DEG)],
        "b_body2": [(X, 6)],
    }


def build_run(rig):
    for action in list(bpy.data.actions):
        if action.name == CLIP_NAME:
            bpy.data.actions.remove(action)
    action = bpy.data.actions.new(CLIP_NAME)
    rig.animation_data_create()
    rig.animation_data.action = action

    half = CYCLE_FRAMES // 2
    quarter = half // 2
    # 着地で沈み、体の下を足が通る瞬間に浮く。丸い体なので縦に潰す量を大きめに取る
    land = {"b_body1": (1.05, 0.95, 1.05)}
    # 高さの単位はモデル空間（体高およそ 3.1）
    up = {"b_root": (0, 0, 0.22)}
    down = {"b_root": (0, 0, -0.04)}

    key_pose(rig, 1, stride(1), scales=land, locations=down)
    key_pose(rig, 1 + quarter, passing(1), locations=up)
    key_pose(rig, 1 + half, stride(-1), scales=land, locations=down)
    key_pose(rig, 1 + half + quarter, passing(-1), locations=up)
    key_pose(rig, 1 + CYCLE_FRAMES, stride(1), scales=land, locations=down)

    action.use_fake_user = True
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
        pb.location = (0, 0, 0)
    return action


def render_preview(rig, action, frames):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = 480
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.7, 0.45, 0.3)
    scene.render.film_transparent = False
    cam_data = bpy.data.cameras.new("preview_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 6.2
    cam = bpy.data.objects.new("preview_cam", cam_data)
    scene.collection.objects.link(cam)
    # 左側面から。+X 側から -X 方向を見る（前 = -Y が画面の左）
    cam.location = (12, 0, -1.2)
    cam.rotation_euler = (math.radians(90), 0, math.radians(90))
    scene.camera = cam
    rig.animation_data_create()
    rig.animation_data.action = action
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"run_{frame:02d}.png")
        bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None


def main():
    glb = GLB_PATHS[0]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    action = build_run(rig)

    if PREVIEW_DIR:
        render_preview(rig, action, [1, 1 + CYCLE_FRAMES // 4, 1 + CYCLE_FRAMES // 2, 1 + CYCLE_FRAMES * 3 // 4])
        return

    # インポータが付けるアクションは fake user が無く、書き出しで落ちることがあるので全部に付ける
    for each in bpy.data.actions:
        each.use_fake_user = True
    for path in GLB_PATHS:
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            export_yup=True,
            export_skins=True,
            export_def_bones=True,
            export_animations=True,
            export_animation_mode="ACTIONS",
            export_reset_pose_bones=True,
            export_apply=False,
        )
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
