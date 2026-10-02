"""うんちくん 3D ベースモデル (poopm_base.glb) を生成する。

仕様は docs/poopm-3d.md。形状を直すときはこのファイルのパラメータを変えて再生成する。

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python scripts/poopm-3d/build_poopm_base.py

Blender 側は Z-up / -Y 正面 / メートル。glTF 書き出しで Y-up / +Z 正面に変換される。
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_PATH = os.path.join(REPO, "public", "assets", "poopm_3d", "poopm_base.glb")
EYE_PNG = os.path.join(REPO, "public", "assets", "poopm_parts", "eyes", "poopm_eye_a.png")
MOUTH_PNG = os.path.join(REPO, "public", "assets", "poopm_parts", "mouth", "poopm_mouth_a.png")

FPS = 24

# ---------------------------------------------------------------------------
# 形状パラメータ（単位: m）。docs/pictures/poopm3dver2.0.png の正面図から採寸
# ---------------------------------------------------------------------------

# 胴体3段。各段は超楕円の回転体で、外形は3段の最大値を取る（段の境が溝になる）
# (半径, 中心高さ, 半高さ, 超楕円指数)
TIERS = [
    (0.230, 0.365, 0.105, 2.3),  # 下段
    (0.172, 0.530, 0.085, 2.3),  # 中段
    (0.118, 0.668, 0.078, 2.2),  # 上段
]
BODY_SEGMENTS = 64
PROFILE_SAMPLES = 72  # 1段あたり
GROOVE_SMOOTH_ITER = 3

# 先端カール: 上段に埋まった根元から、前方(-Y)かつ斜め横(+X)へ倒れるコンマ型
CURL_SPINE = [
    Vector((0.000, 0.000, 0.705)),
    Vector((0.002, -0.002, 0.775)),
    Vector((0.014, -0.010, 0.835)),
    Vector((0.042, -0.024, 0.872)),
    Vector((0.074, -0.036, 0.884)),
]
CURL_BASE_RADIUS = 0.064
CURL_SEGMENTS = 32
CURL_STEPS = 40

# 腕（左 = +X）。肩は中段側面の奥から出し、斜め上45°のバンザイ気味
ARM_SHOULDER = Vector((0.120, 0.0, 0.505))
ARM_ELBOW = Vector((0.215, 0.0, 0.585))
ARM_WRIST = Vector((0.285, 0.0, 0.680))
ARM_HAND = Vector((0.297, 0.0, 0.700))  # 指の付け根
ARM_RADIUS = 0.0115
ARM_JOINT_BULGE = 0.0025
FINGER_LEN = 0.048
FINGER_RADIUS = 0.0085
FINGER_SPREAD_DEG = 36  # 3本の扇の開き（中央から左右）

# 脚（左 = +X）。外八気味に開く
LEG_HIP = Vector((0.085, 0.0, 0.300))
LEG_KNEE = Vector((0.103, 0.0, 0.165))
LEG_ANKLE = Vector((0.122, -0.004, 0.040))
LEG_TOE = Vector((0.140, -0.070, 0.022))
LEG_RADIUS = 0.0155
LEG_JOINT_BULGE = 0.0025
FOOT_CENTER = Vector((0.130, -0.022, 0.030))
FOOT_RADII = Vector((0.054, 0.072, 0.032))  # 豆形の扁平楕円
FOOT_YAW_DEG = -18  # つま先を外へ

LIMB_SEGMENTS = 16

# 顔プレート（胴体前面から浮かせる距離）
FACE_OFFSET = 0.004
EYE_WIDTH = 0.230
EYE_CENTER_Z = 0.545
MOUTH_WIDTH = 0.095
MOUTH_CENTER_Z = 0.372

HEAD_ACC_Z = 0.745  # 最上段の上。頭アクセサリの接地点

BODY_COLOR = (0.50, 0.23, 0.11, 1.0)  # linear。sRGB で #BA8360 前後
LIMB_COLOR = (0.20, 0.075, 0.03, 1.0)  # 胴体より濃い焦茶で固定


# ---------------------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.unit_settings.system = "METRIC"


def new_object(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def make_material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def make_plate_material(name, png_path):
    """透過PNGを貼る alphaTest マテリアル。Round ノードで glTF の alphaMode=MASK になる。"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.6
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(png_path, check_existing=True)
    tex.interpolation = "Linear"
    tex.extension = "CLIP"
    round_node = nodes.new("ShaderNodeMath")
    round_node.operation = "ROUND"
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], round_node.inputs[0])
    links.new(round_node.outputs[0], bsdf.inputs["Alpha"])
    return mat


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------
# 胴体
# ---------------------------------------------------------------------------


def superellipse_radius(tier, z):
    radius, zc, half_h, n = tier
    u = abs(z - zc) / half_h
    if u >= 1.0:
        return 0.0
    return radius * (1.0 - u**n) ** (1.0 / n)


def body_radius(z):
    return max(superellipse_radius(t, z) for t in TIERS)


def body_profile():
    """(r, z) を下から上へ。各段を角度でサンプルし、外形に出ている点だけ残す。"""
    points = []
    for tier in TIERS:
        radius, zc, half_h, n = tier
        for i in range(PROFILE_SAMPLES + 1):
            a = -math.pi / 2 + math.pi * i / PROFILE_SAMPLES
            c, s = math.cos(a), math.sin(a)
            r = radius * abs(c) ** (2.0 / n)
            z = zc + half_h * math.copysign(abs(s) ** (2.0 / n), s)
            if r >= body_radius(z) - 1e-6:
                points.append((r, z))
    points.sort(key=lambda p: p[1])
    # 下端と上端は軸上の極に置き換える
    bottom = (0.0, TIERS[0][1] - TIERS[0][2])
    top = (0.0, TIERS[-1][1] + TIERS[-1][2])
    points = [p for p in points if p[0] > 1e-4 and bottom[1] < p[1] < top[1]]
    # 溝の角を少しだけ丸める（溝そのものは残す）
    for _ in range(GROOVE_SMOOTH_ITER):
        smoothed = [points[0]]
        for i in range(1, len(points) - 1):
            r = (points[i - 1][0] + 2 * points[i][0] + points[i + 1][0]) / 4
            z = (points[i - 1][1] + 2 * points[i][1] + points[i + 1][1]) / 4
            smoothed.append((r, z))
        smoothed.append(points[-1])
        points = smoothed
    return bottom, points, top


def add_revolved(bm, bottom, ring_profile, top, segments):
    rings = []
    for r, z in ring_profile:
        ring = []
        for j in range(segments):
            a = 2 * math.pi * j / segments
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    v_bottom = bm.verts.new((0, 0, bottom[1]))
    v_top = bm.verts.new((0, 0, top[1]))
    for j in range(segments):
        k = (j + 1) % segments
        bm.faces.new((v_bottom, rings[0][k], rings[0][j]))
        bm.faces.new((v_top, rings[-1][j], rings[-1][k]))
        for i in range(len(rings) - 1):
            bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))


def parallel_transport_frames(points):
    tangents = []
    for i in range(len(points)):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        tangents.append((b - a).normalized())
    ref = Vector((1, 0, 0)) if abs(tangents[0].x) < 0.9 else Vector((0, 1, 0))
    normal = tangents[0].cross(ref).normalized()
    frames = []
    for i, t in enumerate(tangents):
        if i > 0:
            axis = tangents[i - 1].cross(t)
            if axis.length > 1e-8:
                angle = tangents[i - 1].angle(t)
                normal = Quaternion(axis.normalized(), angle) @ normal
        binormal = t.cross(normal).normalized()
        normal = binormal.cross(t).normalized()
        frames.append((t, normal, binormal))
    return frames


def catmull_rom(points, steps):
    pts = [points[0]] + list(points) + [points[-1]]
    out = []
    n_seg = len(points) - 1
    for s in range(n_seg):
        p0, p1, p2, p3 = pts[s], pts[s + 1], pts[s + 2], pts[s + 3]
        count = steps if s == n_seg - 1 else steps
        for i in range(count):
            t = i / count
            t2, t3 = t * t, t * t * t
            out.append(
                0.5
                * (
                    (2 * p1)
                    + (-p0 + p2) * t
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
                )
            )
    out.append(points[-1].copy())
    return out


def add_tube(bm, spine, radii, segments, cap_start=True, cap_end=True):
    """spine に沿って半径 radii の管を作る。両端は極で閉じる。"""
    frames = parallel_transport_frames(spine)
    rings = []
    for p, r, (_, n, b) in zip(spine, radii, frames):
        ring = []
        for j in range(segments):
            a = 2 * math.pi * j / segments
            ring.append(bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(segments):
            k = (j + 1) % segments
            bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))
    if cap_start:
        pole = bm.verts.new(spine[0] - frames[0][0] * radii[0] * 0.6)
        for j in range(segments):
            k = (j + 1) % segments
            bm.faces.new((pole, rings[0][k], rings[0][j]))
    if cap_end:
        pole = bm.verts.new(spine[-1] + frames[-1][0] * max(radii[-1], 1e-4) * 0.6)
        for j in range(segments):
            k = (j + 1) % segments
            bm.faces.new((pole, rings[-1][j], rings[-1][k]))


def build_body(mat):
    bm = bmesh.new()
    bottom, profile, top = body_profile()
    add_revolved(bm, bottom, profile, top, BODY_SEGMENTS)

    spine = catmull_rom(CURL_SPINE, CURL_STEPS // (len(CURL_SPINE) - 1))
    radii = []
    for i in range(len(spine)):
        t = i / (len(spine) - 1)
        # 根元は太く、先端に向けて細る。先端は丸く閉じる
        radii.append(CURL_BASE_RADIUS * (1 - t) ** 0.85 + 0.004 * math.sin(math.pi * t) + 0.0015)
    add_tube(bm, spine, radii, CURL_SEGMENTS)

    mesh = bpy.data.meshes.new("body")
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return new_object("body", mesh)


# ---------------------------------------------------------------------------
# 手足
# ---------------------------------------------------------------------------


def joint_radius_profile(chain, base_radius, bulge, steps_per_seg):
    """節（関節）で少し膨らむ管の中心線と半径。"""
    spine, radii = [], []
    for s in range(len(chain) - 1):
        a, b = chain[s], chain[s + 1]
        last = s == len(chain) - 2
        count = steps_per_seg + (1 if last else 0)
        for i in range(count):
            t = i / steps_per_seg
            spine.append(a.lerp(b, t))
            joint = max(math.exp(-((t / 0.3) ** 2)), math.exp(-(((1 - t) / 0.3) ** 2)))
            radii.append(base_radius + bulge * joint)
    return spine, radii


def mirror_x(v):
    return Vector((-v.x, v.y, v.z))


def side_point(v, side):
    return v.copy() if side == "L" else mirror_x(v)


def finger_directions(side):
    """手首→指先の方向を基準に、腕の平面（XZ）で扇状に3本開く。"""
    base = (ARM_HAND - ARM_WRIST).normalized()
    axis = Vector((0, 1, 0))
    dirs = []
    for deg in (-FINGER_SPREAD_DEG, 0, FINGER_SPREAD_DEG):
        d = Quaternion(axis, math.radians(deg)) @ base
        dirs.append(d if side == "L" else mirror_x(d))
    return dirs


def build_mesh_obj(name, build, mat):
    bm = bmesh.new()
    build(bm)
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return new_object(name, mesh)


def build_limbs(mat):
    objs = {}
    for side in ("L", "R"):
        arm_chain = [side_point(p, side) for p in (ARM_SHOULDER, ARM_ELBOW, ARM_WRIST, ARM_HAND)]

        def arm(bm, arm_chain=arm_chain):
            spine, radii = joint_radius_profile(arm_chain, ARM_RADIUS, ARM_JOINT_BULGE, 10)
            add_tube(bm, spine, radii, LIMB_SEGMENTS)

        objs[f"arm_{side}"] = build_mesh_obj(f"arm_{side}", arm, mat)

        hand_root = side_point(ARM_HAND, side)

        def hand(bm, side=side, hand_root=hand_root):
            # 掌は持たない。付け根の小さな節から3本の指が出る
            bmesh.ops.create_uvsphere(
                bm,
                u_segments=LIMB_SEGMENTS,
                v_segments=10,
                radius=ARM_RADIUS + ARM_JOINT_BULGE,
                matrix=Matrix.Translation(hand_root),
            )
            for d in finger_directions(side):
                spine = [hand_root + d * (FINGER_LEN * i / 8) for i in range(9)]
                radii = []
                for i in range(9):
                    t = i / 8
                    # 指先がぷっくり丸い小枝
                    radii.append(FINGER_RADIUS * (0.8 + 0.35 * math.exp(-(((1 - t) / 0.25) ** 2))))
                add_tube(bm, spine, radii, LIMB_SEGMENTS)

        objs[f"hand_{side}"] = build_mesh_obj(f"hand_{side}", hand, mat)

        leg_chain = [side_point(p, side) for p in (LEG_HIP, LEG_KNEE, LEG_ANKLE)]

        def leg(bm, leg_chain=leg_chain):
            spine, radii = joint_radius_profile(leg_chain, LEG_RADIUS, LEG_JOINT_BULGE, 12)
            add_tube(bm, spine, radii, LIMB_SEGMENTS)

        objs[f"leg_{side}"] = build_mesh_obj(f"leg_{side}", leg, mat)

        def foot(bm, side=side):
            yaw = math.radians(FOOT_YAW_DEG if side == "L" else -FOOT_YAW_DEG)
            center = side_point(FOOT_CENTER, side)
            m = (
                Matrix.Translation(center)
                @ Matrix.Rotation(-yaw, 4, "Z")
                @ Matrix.Diagonal((FOOT_RADII.x, FOOT_RADII.y, FOOT_RADII.z, 1))
            )
            bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0, matrix=m)
            # 豆形: 内側を少し凹ませ、底を平らに寄せる
            for v in bm.verts:
                local = v.co - center
                inward = -1 if side == "L" else 1
                if local.x * inward > 0:
                    v.co.x -= inward * 0.012 * math.exp(-((local.y / 0.03) ** 2)) * (
                        abs(local.x) / FOOT_RADII.x
                    )
                if local.z < 0:
                    v.co.z = center.z + local.z * 0.7

        objs[f"foot_{side}"] = build_mesh_obj(f"foot_{side}", foot, mat)
    return objs


# ---------------------------------------------------------------------------
# 顔プレート
# ---------------------------------------------------------------------------


def build_face_plate(name, png_path, width, center_z):
    img = bpy.data.images.load(png_path, check_existing=True)
    w_px, h_px = img.size
    height = width * h_px / w_px
    z0, z1 = center_z - height / 2, center_z + height / 2
    def plate_radius(z):
        # 胴体前面の膨らみに沿わせる。段の溝には落とさず、近傍の最大半径で橋渡しする
        window = 0.025
        return max(body_radius(z + window * (k / 4 - 1)) for k in range(9)) + FACE_OFFSET

    cols, rows = 16, 12
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    grid = []
    for iz in range(rows + 1):
        row = []
        for ix in range(cols + 1):
            u, v = ix / cols, iz / rows
            x = (u - 0.5) * width
            z = z0 + v * height
            radius = plate_radius(z)
            y = -math.sqrt(max(radius * radius - x * x, 0.0))
            row.append((bm.verts.new((x, y, z)), (u, v)))
        grid.append(row)
    for iz in range(rows):
        for ix in range(cols):
            quad = [grid[iz][ix], grid[iz][ix + 1], grid[iz + 1][ix + 1], grid[iz + 1][ix]]
            face = bm.faces.new([q[0] for q in quad])
            for loop, (_, uv) in zip(face.loops, quad):
                loop[uv_layer].uv = uv
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(make_plate_material(f"poopm_{name}", png_path))
    return new_object(name, mesh)


# ---------------------------------------------------------------------------
# リグ
# ---------------------------------------------------------------------------

BODY_BONE_Z = [TIERS[0][1] - TIERS[0][2], 0.455, 0.600, 0.720, CURL_SPINE[-1].z]


def build_armature():
    arm_data = bpy.data.armatures.new("poopm_rig")
    rig = new_object("poopm_rig", arm_data)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent=None, connect=False, roll=0.0):
        b = eb.new(name)
        b.head, b.tail = Vector(head), Vector(tail)
        b.roll = roll
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    z = BODY_BONE_Z
    bone("b_root", (0, 0, 0), (0, 0, 0.1))
    bone("b_body1", (0, 0, z[0]), (0, 0, z[1]), "b_root")
    bone("b_body2", (0, 0, z[1]), (0, 0, z[2]), "b_body1", True)
    bone("b_body3", (0, 0, z[2]), (0, 0, z[3]), "b_body2", True)
    bone("b_head", (0, 0, z[3]), CURL_SPINE[-1], "b_body3", True)
    bone("b_head_acc", (0, 0, HEAD_ACC_Z), (0, 0, HEAD_ACC_Z + 0.06), "b_head")
    face_z = (EYE_CENTER_Z + MOUTH_CENTER_Z) / 2
    face_y = -body_radius(face_z)
    # 顔は中段〜下段にあるので b_body2 の子にする。b_head（カールの根元）の子にすると、
    # 頭が前傾したとき支点より下の顔が後ろへ回り込み、胴体にめり込む
    bone("b_face", (0, face_y, face_z), (0, face_y - 0.06, face_z), "b_body2")

    for side in ("L", "R"):
        sp = lambda v: side_point(v, side)  # noqa: E731
        bone(f"b_upperarm_{side}", sp(ARM_SHOULDER), sp(ARM_ELBOW), "b_body2")
        bone(f"b_forearm_{side}", sp(ARM_ELBOW), sp(ARM_WRIST), f"b_upperarm_{side}", True)
        bone(f"b_hand_{side}", sp(ARM_WRIST), sp(ARM_HAND), f"b_forearm_{side}", True)
        for letter, d in zip("abc", finger_directions(side)):
            root = sp(ARM_HAND)
            bone(f"b_finger{letter}_{side}", root, root + d * FINGER_LEN, f"b_hand_{side}")
        bone(f"b_thigh_{side}", sp(LEG_HIP), sp(LEG_KNEE), "b_body1")
        bone(f"b_shin_{side}", sp(LEG_KNEE), sp(LEG_ANKLE), f"b_thigh_{side}", True)
        bone(f"b_foot_{side}", sp(LEG_ANKLE), sp(LEG_TOE), f"b_shin_{side}", True)

    bpy.ops.object.mode_set(mode="OBJECT")
    # ソケット（b_head_acc / b_face）もウエイト無しのデフォームボーンにする。
    # export_def_bones で落とされず、ノードとして glTF に残すため
    for b in arm_data.bones:
        b.use_deform = True
    return rig


def bind(obj, rig, weights_fn):
    """weights_fn(co) -> {bone: weight}。正規化して頂点グループに入れる。"""
    groups = {}
    for v in obj.data.vertices:
        w = weights_fn(v.co)
        total = sum(w.values())
        for name, value in w.items():
            if value <= 1e-4:
                continue
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([v.index], value / total, "REPLACE")
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    obj.parent = rig


def chain_weights(co, chain, names, blend):
    """関節の前後 blend の範囲で隣接ボーンに重みを分ける。"""
    best, best_t, best_d = 0, 0.0, 1e9
    for i in range(len(chain) - 1):
        a, b = chain[i], chain[i + 1]
        ab = b - a
        t = max(0.0, min(1.0, (co - a).dot(ab) / ab.length_squared))
        d = (co - a.lerp(b, t)).length
        if d < best_d:
            best, best_t, best_d = i, t, d
    seg_len = (chain[best + 1] - chain[best]).length
    w = {names[best]: 1.0}
    edge = blend / seg_len
    if best_t < edge and best > 0:
        k = 0.5 * (1 - best_t / edge)
        w = {names[best]: 1 - k, names[best - 1]: k}
    elif best_t > 1 - edge and best < len(names) - 1:
        k = 0.5 * (1 - (1 - best_t) / edge)
        w = {names[best]: 1 - k, names[best + 1]: k}
    return w


def body_weights(co):
    z = BODY_BONE_Z
    blend = 0.03
    names = ["b_body1", "b_body2", "b_body3", "b_head"]
    w = {n: 0.0 for n in names}
    bounds = z[1:4]
    idx = sum(1 for b in bounds if co.z >= b)
    w[names[idx]] = 1.0
    for i, b in enumerate(bounds):
        if abs(co.z - b) < blend:
            k = smoothstep(b - blend, b + blend, co.z)
            w = {n: 0.0 for n in names}
            w[names[i]] = 1 - k
            w[names[i + 1]] = k
    return w


def bind_all(rig, body, limbs, eye, mouth):
    bind(body, rig, body_weights)
    for side in ("L", "R"):
        sp = lambda v: side_point(v, side)  # noqa: E731
        arm_chain = [sp(ARM_SHOULDER), sp(ARM_ELBOW), sp(ARM_WRIST), sp(ARM_HAND)]
        arm_names = [f"b_upperarm_{side}", f"b_forearm_{side}", f"b_hand_{side}"]
        bind(limbs[f"arm_{side}"], rig, lambda co: chain_weights(co, arm_chain, arm_names, 0.02))

        dirs = finger_directions(side)
        root = sp(ARM_HAND)

        def hand_w(co, dirs=dirs, root=root, side=side):
            rel = co - root
            if rel.length < ARM_RADIUS + ARM_JOINT_BULGE + 0.002:
                return {f"b_hand_{side}": 1.0}
            best = max(range(3), key=lambda i: rel.normalized().dot(dirs[i]))
            return {f"b_finger{'abc'[best]}_{side}": 1.0}

        bind(limbs[f"hand_{side}"], rig, hand_w)

        leg_chain = [sp(LEG_HIP), sp(LEG_KNEE), sp(LEG_ANKLE)]
        leg_names = [f"b_thigh_{side}", f"b_shin_{side}"]
        bind(limbs[f"leg_{side}"], rig, lambda co: chain_weights(co, leg_chain, leg_names, 0.025))
        bind(limbs[f"foot_{side}"], rig, lambda co, side=side: {f"b_foot_{side}": 1.0})

    # 差し替えノードはスキンせず、ソケットボーンにリジッドで親子付け
    for obj in (eye, mouth):
        parent_to_bone(obj, rig, "b_face")


def parent_to_bone(obj, rig, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    bpy.context.view_layer.update()
    obj.matrix_world = world


def build_head_acc_socket(rig):
    empty = bpy.data.objects.new("head_acc", None)
    empty.empty_display_type = "ARROWS"
    empty.empty_display_size = 0.05
    bpy.context.scene.collection.objects.link(empty)
    empty.matrix_world = Matrix.Translation((0, 0, HEAD_ACC_Z))
    parent_to_bone(empty, rig, "b_head_acc")
    return empty


# ---------------------------------------------------------------------------
# アニメーション
# ---------------------------------------------------------------------------


def world_rot(rig, bone_name, axis, degrees):
    """ワールド軸まわりの回転を、ボーンのレスト空間のクォータニオンに直す。"""
    rest = rig.data.bones[bone_name].matrix_local.to_3x3()
    local_axis = (rest.inverted() @ Vector(axis)).normalized()
    return Quaternion(local_axis, math.radians(degrees))


def aim_arm(rig, side, elbow_target, hand_target):
    """上腕を肘の目標へ、前腕を手の目標へ向けるレスト空間の回転を返す（2ボーンの簡易IK）。"""
    upper = rig.data.bones[f"b_upperarm_{side}"]
    fore = rig.data.bones[f"b_forearm_{side}"]
    ru = upper.matrix_local.to_3x3()
    rf = fore.matrix_local.to_3x3()
    q1 = (upper.tail_local - upper.head_local).rotation_difference(
        Vector(elbow_target) - upper.head_local
    )
    elbow = upper.head_local + q1 @ (upper.tail_local - upper.head_local)
    fore_dir = q1 @ (fore.tail_local - fore.head_local)
    q2 = fore_dir.rotation_difference(Vector(hand_target) - elbow)
    m1 = q1.to_matrix()
    local_upper = (ru.inverted() @ m1 @ ru).to_quaternion()
    local_fore = (rf.inverted() @ m1.inverted() @ q2.to_matrix() @ m1 @ rf).to_quaternion()
    return {upper.name: local_upper, fore.name: local_fore}


class Clip:
    def __init__(self, rig, name, length):
        self.rig = rig
        self.length = length
        self.action = bpy.data.actions.new(name)
        self.action.use_fake_user = True
        rig.animation_data_create()
        rig.animation_data.action = self.action
        self.keyed = set()

    def pose(self, frame, rotations=None, scales=None, locations=None, local_rots=None):
        """rotations: {bone: [(world_axis, deg), ...]}, scales: {bone: (x, y, z)},
        local_rots: {bone: Quaternion}（ボーンのレスト空間でそのまま入れる）"""
        pbs = self.rig.pose.bones
        for pb in pbs:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.scale = (1, 1, 1)
            pb.location = (0, 0, 0)
        for name, rots in (rotations or {}).items():
            q = Quaternion()
            for axis, deg in rots:
                q = world_rot(self.rig, name, axis, deg) @ q
            pbs[name].rotation_quaternion = q
        for name, q in (local_rots or {}).items():
            pbs[name].rotation_quaternion = q
        for name, s in (scales or {}).items():
            pbs[name].scale = s
        for name, loc in (locations or {}).items():
            rest = self.rig.data.bones[name].matrix_local.to_3x3()
            pbs[name].location = rest.inverted() @ Vector(loc)
        touched = set(rotations or {}) | set(scales or {}) | set(locations or {}) | set(local_rots or {})
        self.keyed |= touched
        for name in self.keyed:
            pb = pbs[name]
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            pb.keyframe_insert("scale", frame=frame)
            pb.keyframe_insert("location", frame=frame)

    def finish(self):
        track = self.rig.animation_data.nla_tracks.new()
        track.name = self.action.name
        track.strips.new(self.action.name, 1, self.action)
        self.rig.animation_data.action = None


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def arms(deg_l, deg_r, axis=Y):
    """腕の上げ下げ。+ で上がる（左右で回転方向を反転）。"""
    return {
        "b_upperarm_L": [(axis, deg_l)],
        "b_upperarm_R": [(axis, -deg_r)],
    }


def build_animations(rig):
    # 全クリップの基準ポーズ = レスト。KEY はクリップ間で共有するボーン一覧
    all_keys = [
        "b_root", "b_body1", "b_body2", "b_body3", "b_head", "b_face",
        "b_upperarm_L", "b_upperarm_R", "b_forearm_L", "b_forearm_R",
        "b_thigh_L", "b_thigh_R", "b_shin_L", "b_shin_R", "b_foot_L", "b_foot_R",
    ]  # fmt: skip

    def start(name, length):
        clip = Clip(rig, name, length)
        clip.keyed = set(all_keys)
        return clip

    # idle: 呼吸 + 頭の揺れ（2秒ループ）
    c = start("idle", 48)
    c.pose(1)
    c.pose(
        13,
        rotations={"b_head": [(Y, 5)], **arms(-4, -4)},
        scales={"b_body1": (1.03, 0.96, 1.03), "b_body2": (1.02, 0.98, 1.02)},
    )
    c.pose(25, rotations={"b_head": [(Y, 0)]})
    c.pose(
        37,
        rotations={"b_head": [(Y, -5)], **arms(-4, -4)},
        scales={"b_body1": (1.03, 0.96, 1.03), "b_body2": (1.02, 0.98, 1.02)},
    )
    c.pose(49)
    c.finish()

    # attack: 溜めて前傾し腕を前へ振る
    c = start("attack", 24)
    c.pose(1)
    c.pose(
        6,
        rotations={
            "b_body1": [(X, -8)],
            "b_body2": [(X, -6)],
            "b_upperarm_L": [(X, 30)],
            "b_upperarm_R": [(X, 30)],
        },
        scales={"b_body1": (1.05, 0.93, 1.05)},
    )
    c.pose(
        11,
        rotations={
            "b_body1": [(X, 14)],
            "b_body2": [(X, 10)],
            "b_head": [(X, 8)],
            "b_upperarm_L": [(X, -70), (Y, -20)],
            "b_upperarm_R": [(X, -70), (Y, 20)],
            "b_forearm_L": [(X, -20)],
            "b_forearm_R": [(X, -20)],
        },
        scales={"b_body1": (0.97, 1.05, 0.97)},
        locations={"b_root": (0, -0.04, 0)},
    )
    c.pose(
        16,
        rotations={
            "b_body1": [(X, 10)],
            "b_body2": [(X, 6)],
            "b_upperarm_L": [(X, -55), (Y, -15)],
            "b_upperarm_R": [(X, -55), (Y, 15)],
        },
        locations={"b_root": (0, -0.03, 0)},
    )
    c.pose(25)
    c.finish()

    # hit: のけぞって左右に揺れ、idle の基準ポーズ（レスト）へ戻る
    c = start("hit", 20)
    c.pose(1)
    c.pose(
        4,
        rotations={
            "b_body1": [(X, -12), (Y, 6)],
            "b_body2": [(X, -8)],
            "b_head": [(X, -10), (Y, -8)],
            **arms(15, 15),
        },
        scales={"b_body1": (1.08, 0.9, 1.08)},
        locations={"b_root": (0, 0.05, 0)},
    )
    c.pose(8, rotations={"b_body1": [(Y, -6)], "b_head": [(Y, 7)]}, locations={"b_root": (0, 0.03, 0)})
    c.pose(12, rotations={"b_body1": [(Y, 4)], "b_head": [(Y, -4)]}, locations={"b_root": (0, 0.01, 0)})
    c.pose(16, rotations={"b_body1": [(Y, -1.5)], "b_head": [(Y, 1.5)]})
    c.pose(21)
    c.finish()

    # eat: 右手を口元へ運び、もぐもぐする
    c = start("eat", 36)
    mouth_front = (0.0, -body_radius(MOUTH_CENTER_Z) - 0.05, MOUTH_CENTER_Z + 0.03)
    hand_to_mouth = aim_arm(rig, "R", (-0.20, -0.13, 0.45), mouth_front)
    lean = {"b_body3": [(X, 6)], "b_head": [(X, 6)]}
    chew = {"b_body1": (1.03, 0.95, 1.03)}
    c.pose(1)
    c.pose(9, rotations=lean, local_rots=hand_to_mouth)
    c.pose(15, rotations=lean, local_rots=hand_to_mouth, scales=chew)
    c.pose(21, rotations=lean, local_rots=hand_to_mouth)
    c.pose(27, rotations=lean, local_rots=hand_to_mouth, scales=chew)
    c.pose(37)
    c.finish()

    # walk: 足を交互に出す（1秒ループ）
    c = start("walk", 24)

    def step(sign):
        return {
            "b_thigh_L": [(X, -22 * sign)],
            "b_thigh_R": [(X, 22 * sign)],
            "b_shin_L": [(X, 10 if sign < 0 else 0)],
            "b_shin_R": [(X, 10 if sign > 0 else 0)],
            "b_upperarm_L": [(X, 12 * sign)],
            "b_upperarm_R": [(X, -12 * sign)],
            "b_body1": [(Y, 3 * sign)],
            "b_head": [(Y, -3 * sign)],
        }

    c.pose(1, rotations=step(1))
    c.pose(7, rotations={"b_body1": [(Y, 0)]}, locations={"b_root": (0, 0, 0.02)})
    c.pose(13, rotations=step(-1))
    c.pose(19, rotations={"b_body1": [(Y, 0)]}, locations={"b_root": (0, 0, 0.02)})
    c.pose(25, rotations=step(1))
    c.finish()

    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
        pb.location = (0, 0, 0)


# ---------------------------------------------------------------------------


def main():
    reset_scene()
    body_mat = make_material("poopm_body", BODY_COLOR, 0.42)
    limb_mat = make_material("poopm_limb", LIMB_COLOR, 0.45)

    body = build_body(body_mat)
    limbs = build_limbs(limb_mat)
    eye = build_face_plate("eye", EYE_PNG, EYE_WIDTH, EYE_CENTER_Z)
    mouth = build_face_plate("mouth", MOUTH_PNG, MOUTH_WIDTH, MOUTH_CENTER_Z)

    rig = build_armature()
    bind_all(rig, body, limbs, eye, mouth)
    build_head_acc_socket(rig)
    build_animations(rig)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_skins=True,
        export_def_bones=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_reset_pose_bones=True,
        export_apply=False,
    )
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
