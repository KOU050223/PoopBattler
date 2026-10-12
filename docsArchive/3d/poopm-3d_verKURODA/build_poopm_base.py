"""Build public/assets/poopm_3d/poopm_base.glb — うんちくん 3D base model.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --background \
      --python scripts/poopm-3d/build_poopm_base.py

Generates mesh, armature, skin weights, animation clips, renders preview
stills (front/back/top) to scripts/poopm-3d/out/, and exports the GLB.
Spec: docs/poopm-3d.md. Reference: docs/pictures/poopm3dver2.0.png.
"""

import math
import os
import sys
from math import cos, pi, sin

import bpy
from mathutils import Vector

# ---------------------------------------------------------------- parameters

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GLB_PATH = os.path.join(ROOT, "public/assets/poopm_3d/poopm_base.glb")
OUT_DIR = os.path.join(ROOT, "scripts/poopm-3d/out")

FPS = 24

# 胴体: 閉じたドーム状ローブ3段。R=半径, H=半高さ, Z=中心
# (front = -Y, up = +Z, origin = 接地位置)
LOBES = [
    # (radius, half_height, z_center, cx, cy)
    (0.145, 0.075, 0.255, 0.0, 0.0),   # tier1 bottom
    (0.118, 0.062, 0.345, 0.0, 0.0),   # tier2 middle
    (0.090, 0.054, 0.425, 0.0, 0.0),   # tier3 top
]

# 先端カール: コンマ型に前方(-Y)+左(+X)へ倒れる。path点列と半径
CURL_PTS = [
    (0.000, 0.000, 0.455),
    (0.006, -0.012, 0.500),
    (0.020, -0.030, 0.545),
    (0.038, -0.040, 0.575),
    (0.050, -0.038, 0.600),
    (0.058, -0.026, 0.615),
]
CURL_RADII = [0.060, 0.052, 0.042, 0.030, 0.018, 0.0]

# 腕 (character left = +X). shoulder→elbow→wrist
ARM_L = [(0.105, -0.005, 0.365), (0.160, -0.010, 0.438), (0.190, -0.010, 0.495)]
ARM_R = [(-x, y, z) for x, y, z in ARM_L]
ARM_RADII = (0.0135, 0.0115, 0.0110)  # upper, elbow, forearm

# 手: 掌なし小枝状、3本指を扇状に。指先方向は手首からの相対ベクトル
FINGER_DIRS = [(-0.35, 0.0, 0.94), (0.05, 0.0, 1.00), (0.45, 0.0, 0.90)]
FINGER_LEN = 0.034
FINGER_R = 0.0058
PALM_R = 0.013

# 脚: hip→knee→ankle、外八気味
LEG_L = [(0.070, 0.005, 0.205), (0.082, 0.0, 0.115), (0.093, -0.004, 0.030)]
LEG_R = [(-x, y, z) for x, y, z in LEG_L]
LEG_RADII = (0.0145, 0.0120, 0.0110)

# 足: 豆形扁平楕円、前方(-Y)向き
FOOT_L = dict(c=(0.098, -0.022, 0.016), s=(0.030, 0.052, 0.017))
FOOT_R = dict(c=(-0.098, -0.022, 0.016), s=(0.030, 0.052, 0.017))

# フェイスプレート (front -Y、胴体表面より微小オフセット)
EYE_PLATE = dict(cx=0.0, zc=0.415, w=0.118, h=0.082, off=0.004)
MOUTH_PLATE = dict(cx=0.0, zc=0.322, w=0.082, h=0.056, off=0.004)

BODY_COLOR = (0.164, 0.070, 0.026, 1.0)   # linear ≈ sRGB #A9714B
LIMB_COLOR = (0.055, 0.020, 0.008, 1.0)   # linear ≈ sRGB #6B4226
BODY_ROUGH = 0.5
LIMB_ROUGH = 0.6

# ------------------------------------------------------------------ helpers


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mesh_obj(name, verts, faces, collection=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = True
    return obj


def lobe_geometry(cx, cy, R, h, zc, rings=18, sides=32, fuller=0.62,
                  pinch=0.90, sx=1.0, sy=1.0):
    """Closed dome lobe around Z: bottom/top poles + quad rings.

    fuller<1 widens the mid-body; pinch<1 tapers the underside so the
    upper tier appears to sit into the lower one (visible groove).
    """
    verts = [(cx, cy, zc - h)]  # bottom pole
    for i in range(1, rings):
        a = -pi / 2 + pi * i / rings
        s, c = sin(a), cos(a)
        r = R * (c ** fuller)
        if s < 0:
            r *= 1.0 - (1.0 - pinch) * (-s)
        z = zc + h * s
        for j in range(sides):
            th = 2 * pi * j / sides
            verts.append((cx + r * sx * cos(th), cy + r * sy * sin(th), z))
    top = len(verts)
    verts.append((cx, cy, zc + h))  # top pole
    faces = []
    for j in range(sides):  # bottom fan
        faces.append((0, 1 + j, 1 + (j + 1) % sides))
    for i in range(rings - 2):  # middle quads
        base0 = 1 + i * sides
        base1 = base0 + sides
        for j in range(sides):
            j2 = (j + 1) % sides
            faces.append((base0 + j, base1 + j, base1 + j2, base0 + j2))
    base = 1 + (rings - 2) * sides  # top fan
    for j in range(sides):
        faces.append((base + j, top, base + (j + 1) % sides))
    return verts, faces


def tube_geometry(pts, radii, sides=16, cap_start=True):
    """Tube along a polyline with per-point radius. Returns (verts, faces,
    rings) where rings[i] is the vertex-index range of ring i."""
    n = len(pts)
    verts, faces, rings = [], [], []

    def tangent(i):
        a = Vector(pts[max(i - 1, 0)])
        b = Vector(pts[min(i + 1, n - 1)])
        return (b - a).normalized()

    prev_n = None
    for i in range(n):
        t = tangent(i)
        ref = Vector((0, 0, 1))
        if abs(t.dot(ref)) > 0.9:
            ref = Vector((0, 1, 0))
        nv = t.cross(ref).normalized()
        if prev_n is not None and nv.dot(prev_n) < 0:
            nv = -nv
        bv = t.cross(nv).normalized()
        prev_n = nv
        rings.append(len(verts))
        for j in range(sides):
            th = 2 * pi * j / sides
            off = nv * (cos(th) * radii[i]) + bv * (sin(th) * radii[i])
            verts.append(tuple(Vector(pts[i]) + off))
    for i in range(n - 1):
        for j in range(sides):
            j2 = (j + 1) % sides
            a0, b0 = rings[i] + j, rings[i + 1] + j
            faces.append((a0, b0, rings[i + 1] + j2, rings[i] + j2))
    if cap_start:
        ci = len(verts)
        verts.append(pts[0])
        for j in range(sides):
            faces.append((ci, rings[0] + (j + 1) % sides, rings[0] + j))
    # tip: last ring collapses when radius==0; cap with fan to its center
    ci = len(verts)
    verts.append(pts[-1])
    last = rings[-1]
    for j in range(sides):
        faces.append((last + j, ci, last + (j + 1) % sides))
    return verts, faces, rings


def body_radius_at(z):
    """Approx front-surface radius of the stacked lobes at height z."""
    best = 0.0
    for R, h, zc, _, _ in LOBES:
        if zc - h <= z <= zc + h:
            s = (z - zc) / h
            c = math.sqrt(max(0.0, 1.0 - s * s))
            r = R * (c ** 0.62)
            if s < 0:
                r *= 1.0 - 0.10 * (-s)
            best = max(best, r)
    return best


def curved_plate(name, cx, zc, w, h, off, nx=10, nz=6):
    """Quad grid conforming to the body front surface (front = -Y)."""
    verts, faces = [], []
    for iz in range(nz + 1):
        z = zc - h / 2 + h * iz / nz
        r = max(body_radius_at(z), w / 2 + 0.005)
        for ix in range(nx + 1):
            x = cx - w / 2 + w * ix / nx
            y = -math.sqrt(max(r * r - x * x, 1e-6)) - off
            verts.append((x, y, z))
    for iz in range(nz):
        for ix in range(nx):
            a = iz * (nx + 1) + ix
            b = a + nx + 1
            faces.append((a, b, b + 1, a + 1))
    return make_mesh_obj(name, verts, faces)


def make_material(name, color, rough=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def make_face_material():
    """Transparent dummy for face plates; runtime swaps the texture."""
    img = bpy.data.images.new("poopm_face_dummy", width=2, height=2, alpha=True)
    img.pixels = [0.0] * 16
    img.generated_color = (0.0, 0.0, 0.0, 0.0)
    img.filepath = "poopm_face_dummy.png"
    img.source = "GENERATED"
    mat = bpy.data.materials.new("poopm_face")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    for attr, val in (("surface_render_method", "DITHERED"),
                      ("blend_method", "BLEND"),
                      ("use_transparency_overlap", False)):
        try:
            setattr(mat, attr, val)
        except (AttributeError, TypeError):
            pass
    mat.use_backface_culling = False
    return mat


# ---------------------------------------------------------------- bone specs

def b(x, y, z):
    return Vector((x, y, z))


BONES = {
    # name: (head, tail, parent)
    "b_root": (b(0, 0, 0.0), b(0, 0, 0.05), None),
    "b_body1": (b(0, 0, 0.20), b(0, 0, 0.29), "b_root"),
    "b_body2": (b(0, 0, 0.29), b(0, 0, 0.375), "b_body1"),
    "b_body3": (b(0, 0, 0.375), b(0, 0, 0.45), "b_body2"),
    "b_head": (b(0, 0, 0.45), b(0.02, -0.01, 0.55), "b_body3"),
    "b_face": (b(0, -0.10, 0.40), b(0, -0.10, 0.45), "b_head"),
    "b_head_acc": (b(0, 0, 0.50), b(0, 0, 0.56), "b_head"),
}


def add_limb_bones(prefix, chain, parent, finger_tips=None):
    """chain: list of 3 points -> 2 bones. finger_tips: optional list of
    absolute tip points fanning from chain[-1]."""
    names = []
    for i, seg_name in enumerate(prefix):
        head, tail = chain[i], chain[i + 1]
        names.append(seg_name)
        BONES[seg_name] = (b(*head), b(*tail), parent if i == 0 else names[i - 1])
    if finger_tips:
        for fname, tip in finger_tips:
            BONES[fname] = (b(*chain[-1]), b(*tip), names[-1])
    return names


def build_armature():
    # arms
    add_limb_bones(["b_upperarm_L", "b_forearm_L"], ARM_L, "b_body2")
    add_limb_bones(["b_upperarm_R", "b_forearm_R"], ARM_R, "b_body2")
    wrist_l, wrist_r = Vector(ARM_L[-1]), Vector(ARM_R[-1])
    for side, wrist, sign in (("L", wrist_l, 1.0), ("R", wrist_r, -1.0)):
        BONES[f"b_hand_{side}"] = (wrist, wrist + Vector((0.02 * sign, 0, 0.02)),
                                   f"b_forearm_{side}")
        for k, d in enumerate("abc"):
            dv = Vector(FINGER_DIRS[k])
            dv.x *= sign
            BONES[f"b_finger{d}_{side}"] = (
                wrist, wrist + dv.normalized() * FINGER_LEN * 0.7,
                f"b_hand_{side}")
    # legs
    add_limb_bones(["b_thigh_L", "b_shin_L"], LEG_L, "b_root")
    add_limb_bones(["b_thigh_R", "b_shin_R"], LEG_R, "b_root")
    for side, ankle, fc in (("L", LEG_L[-1], FOOT_L["c"]),
                            ("R", LEG_R[-1], FOOT_R["c"])):
        ankle_v = Vector(ankle)
        toe = Vector((fc[0], fc[1] - 0.045, 0.010))
        BONES[f"b_foot_{side}"] = (ankle_v, toe, f"b_shin_{side}")

    arm_data = bpy.data.armatures.new("poopm_rig")
    arm_obj = bpy.data.objects.new("poopm_rig", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent) in BONES.items():
        eb = arm_data.edit_bones.new(name)
        eb.head, eb.tail = head, tail
        if parent:
            eb.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


# -------------------------------------------------------------- mesh builders

def build_body(mat):
    verts, faces = [], []

    def append(gv, gf):
        base = len(verts)
        verts.extend(gv)
        faces.extend(tuple(i + base for i in f) for f in gf)

    for R, h, zc, cx, cy in LOBES:
        append(*lobe_geometry(cx, cy, R, h, zc))
    cv, cf, _ = tube_geometry(CURL_PTS, CURL_RADII, sides=18)
    append(cv, cf)

    obj = make_mesh_obj("body", verts, faces)
    obj.data.materials.append(mat)
    return obj


def build_limb(name, chain, radii, mat, elbow_i=1):
    """2-segment tube with slight joint bulge."""
    pts = list(chain)
    mid = []
    # subdivide each segment into 4 rings
    path, rad = [], []
    for s in range(len(pts) - 1):
        for k in range(5):
            t = k / 4
            path.append(tuple(Vector(pts[s]).lerp(Vector(pts[s + 1]), t)))
            r = radii[s] if t < 0.5 else radii[s + 1]
            # bulge near joint
            r *= 1.0 + 0.18 * math.exp(-((t - 1.0) ** 2) / 0.02)
            rad.append(r)
    path.append(pts[-1])
    rad.append(radii[-1])
    verts, faces, _ = tube_geometry(path, rad, sides=14)
    obj = make_mesh_obj(name, verts, faces)
    obj.data.materials.append(mat)
    return obj, path


def build_hand(name, wrist, sign, mat):
    """Palm-less twig hand: 3 short finger tubes fanning from the wrist."""
    verts, faces = [], []
    finger_ranges = []
    # tiny palm blob
    pv, pf = lobe_geometry(wrist[0], wrist[1], PALM_R, PALM_R, wrist[2],
                           rings=8, sides=12, fuller=0.9)
    base = len(verts)
    verts.extend(pv)
    faces.extend(tuple(i + base for i in f) for f in pf)
    for d in FINGER_DIRS:
        dv = Vector(d)
        dv.x *= sign
        dv = dv.normalized()
        p0 = Vector(wrist) + dv * (PALM_R * 0.4)
        p1 = Vector(wrist) + dv * (PALM_R * 0.7)
        p2 = Vector(wrist) + dv * FINGER_LEN
        fv, ff, _ = tube_geometry(
            [tuple(p0), tuple(p1), tuple(p2)],
            [FINGER_R, FINGER_R * 0.95, 0.0], sides=10)
        finger_ranges.append((len(verts), len(verts) + len(fv)))
        base = len(verts)
        verts.extend(fv)
        faces.extend(tuple(i + base for i in f) for f in ff)
    obj = make_mesh_obj(name, verts, faces)
    obj.data.materials.append(mat)
    return obj, finger_ranges


def build_foot(name, spec, mat):
    cx, cy, cz = spec["c"]
    sx, sy, sz = spec["s"]
    verts, faces = lobe_geometry(cx, cy, 1.0, 1.0, cz, rings=12, sides=20,
                                 fuller=0.75, pinch=0.85)
    verts = [(cx + (v[0] - cx) * sx, cy + (v[1] - cy) * sy,
              cz + (v[2] - cz) * sz) for v in verts]
    obj = make_mesh_obj(name, verts, faces)
    obj.data.materials.append(mat)
    return obj


# ------------------------------------------------------------------- weights

def set_weights(obj, groups):
    """groups: {bone_name: [(vert_index, weight), ...]}"""
    for bone in groups:
        if obj.vertex_groups.get(bone) is None:
            obj.vertex_groups.new(name=bone)
    per_vert = {}
    for bone, pairs in groups.items():
        for i, w in pairs:
            per_vert.setdefault(i, {})[bone] = w
    for i, bones in per_vert.items():
        total = sum(bones.values()) or 1.0
        for bone, w in bones.items():
            obj.vertex_groups[bone].add([i], w / total, "REPLACE")


def weight_body(obj):
    groups = {"b_body1": [], "b_body2": [], "b_body3": [], "b_head": []}
    bands = [(0.28, 0.33, "b_body1", "b_body2"),
             (0.38, 0.42, "b_body2", "b_body3"),
             (0.455, 0.49, "b_body3", "b_head")]
    for i, v in enumerate(obj.data.vertices):
        z = v.co.z
        w = {"b_body1": 0.0, "b_body2": 0.0, "b_body3": 0.0, "b_head": 0.0}
        if z <= bands[0][0]:
            w["b_body1"] = 1.0
        elif z >= bands[-1][1]:
            w["b_head"] = 1.0
        else:
            assigned = False
            for lo, hi, a, b_ in bands:
                if lo <= z <= hi:
                    t = (z - lo) / (hi - lo)
                    t = t * t * (3 - 2 * t)  # smoothstep
                    w[a], w[b_] = 1.0 - t, t
                    assigned = True
                    break
            if not assigned:
                # flat zones between blend bands
                if z < 0.38:
                    w["b_body2"] = 1.0
                elif z < 0.455:
                    w["b_body3"] = 1.0
        for bone, wt in w.items():
            if wt > 0:
                groups[bone].append((i, wt))
    set_weights(obj, groups)


def weight_tube(obj, path, bone_a, bone_b, seg1_end):
    """Weight limb verts along path param: seg boundary blend at elbow/knee."""
    groups = {bone_a: [], bone_b: []}
    n_rings = len(path)
    ring_verts = len(obj.data.vertices) // n_rings if n_rings else 14
    boundary = seg1_end  # path index of joint
    for i, v in enumerate(obj.data.vertices):
        ring = min(i // ring_verts, n_rings - 1)
        d = ring - boundary
        t = max(-1.0, min(1.0, d / 1.5))
        wb = 0.5 + 0.5 * t
        groups[bone_a].append((i, 1.0 - wb))
        groups[bone_b].append((i, wb))
    set_weights(obj, groups)


def weight_hand(obj, wrist, sign, finger_ranges, side):
    groups = {f"b_hand_{side}": [],
              f"b_finger{'a'}_{side}": [], f"b_finger{'b'}_{side}": [],
              f"b_finger{'c'}_{side}": []}
    palm_end = finger_ranges[0][0]
    for i in range(len(obj.data.vertices)):
        if i < palm_end:
            groups[f"b_hand_{side}"].append((i, 1.0))
    for k, (s, e) in enumerate(finger_ranges):
        bone = f"b_finger{'abc'[k]}_{side}"
        for i in range(s, e):
            groups[bone].append((i, 1.0))
    set_weights(obj, groups)


def rigid_to(obj, bone):
    set_weights(obj, {bone: [(i, 1.0) for i in range(len(obj.data.vertices))]})


def skin(obj, arm_obj):
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    obj.parent = arm_obj


def bone_parent(obj, arm_obj, bone):
    obj.parent = arm_obj
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_parent_inverse = (arm_obj.matrix_world.inverted())


# --------------------------------------------------------------- animations

def pose_key(arm_obj, name, frames_fn):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    ad = arm_obj.animation_data or arm_obj.animation_data_create()
    ad.action = act
    try:  # Blender 4.4+ slotted actions
        slot = act.slots.new(id_type="OBJECT", name=arm_obj.name)
        ad.action_slot = slot
    except (AttributeError, TypeError):
        pass
    frames_fn(arm_obj)
    ad.action = None
    return act


def key(arm_obj, bone, frame, rot=None, loc=None, scale=None):
    pb = arm_obj.pose.bones[bone]
    if rot is not None:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = rot
        pb.keyframe_insert("rotation_euler", frame=frame)
    if loc is not None:
        pb.location = loc
        pb.keyframe_insert("location", frame=frame)
    if scale is not None:
        pb.scale = scale
        pb.keyframe_insert("scale", frame=frame)


def anim_idle(arm_obj):
    for f, s, hy in ((1, 1.0, 0.0), (13, 1.04, 0.05), (25, 1.0, 0.0),
                     (37, 1.03, -0.05), (49, 1.0, 0.0)):
        key(arm_obj, "b_body2", f, scale=(1.0, 1.0, s))
        key(arm_obj, "b_head", f, rot=(0.0, hy, 0.0))


def anim_attack(arm_obj):
    # anticipation -> forward thrust -> recover (lean toward -Y = rot.x>0)
    for f, lean, arm_x in ((1, 0.0, 0.0), (6, -0.12, -0.6),
                           (10, 0.35, 1.2), (16, 0.0, 0.0)):
        key(arm_obj, "b_body2", f, rot=(lean, 0.0, 0.0))
        key(arm_obj, "b_body3", f, rot=(lean * 0.6, 0.0, 0.0))
        key(arm_obj, "b_upperarm_L", f, rot=(0.0, arm_x, 0.0))
        key(arm_obj, "b_upperarm_R", f, rot=(0.0, arm_x, 0.0))


def anim_hit(arm_obj):
    for f, rz, squash in ((1, 0.0, 1.0), (3, 0.18, 0.9), (6, -0.14, 1.05),
                          (9, 0.08, 0.97), (12, -0.03, 1.0), (15, 0.0, 1.0)):
        key(arm_obj, "b_root", f, rot=(0.0, 0.0, rz))
        key(arm_obj, "b_body1", f, scale=(1.0, 1.0, squash))


def anim_eat(arm_obj):
    # right hand to mouth twice
    for f, up, fw in ((1, 0.0, 0.0), (8, -1.5, 0.9), (14, -1.5, 0.9),
                      (20, -1.1, 0.5), (26, -1.5, 0.9), (34, 0.0, 0.0)):
        key(arm_obj, "b_upperarm_R", f, rot=(fw, 0.0, up))
        key(arm_obj, "b_forearm_R", f, rot=(fw * 0.8, 0.0, 0.0))
        key(arm_obj, "b_body3", f, rot=(fw * 0.15, 0.0, 0.0))


def anim_walk(arm_obj):
    for f, sw, bounce in ((1, 0.45, 0.0), (7, -0.45, 0.012),
                          (13, 0.45, 0.0), (19, -0.45, 0.012),
                          (25, 0.45, 0.0)):
        key(arm_obj, "b_thigh_L", f, rot=(sw, 0.0, 0.0))
        key(arm_obj, "b_thigh_R", f, rot=(-sw, 0.0, 0.0))
        key(arm_obj, "b_shin_L", f, rot=(-max(sw, 0.0) * 0.6, 0.0, 0.0))
        key(arm_obj, "b_shin_R", f, rot=(-max(-sw, 0.0) * 0.6, 0.0, 0.0))
        key(arm_obj, "b_upperarm_L", f, rot=(-sw * 0.4, 0.0, 0.0))
        key(arm_obj, "b_upperarm_R", f, rot=(sw * 0.4, 0.0, 0.0))
        key(arm_obj, "b_root", f, loc=(0.0, 0.0, bounce))


def build_animations(arm_obj):
    pose_key(arm_obj, "idle", anim_idle)
    pose_key(arm_obj, "attack", anim_attack)
    pose_key(arm_obj, "hit", anim_hit)
    pose_key(arm_obj, "eat", anim_eat)
    pose_key(arm_obj, "walk", anim_walk)


# ------------------------------------------------------------------- render

def add_camera(name, loc, look_at, ortho=0.78):
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = ortho
    cam = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    d = Vector(look_at) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return cam


def render_previews():
    os.makedirs(OUT_DIR, exist_ok=True)
    scene = bpy.context.scene
    engines = [i.identifier for i in
               scene.render.bl_rna.properties["engine"].enum_items]
    scene.render.engine = next(
        (e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH")
         if e in engines), engines[0])
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    world = bpy.data.worlds.new("preview_world")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.9, 0.9, 0.9, 1.0)
    bg.inputs[1].default_value = 1.0
    scene.world = world
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), math.radians(-15), 0)
    bpy.context.scene.collection.objects.link(sun)
    target = (0, 0, 0.33)
    views = {
        "front": ((0, -1.5, 0.36), target),
        "back": ((0, 1.5, 0.36), target),
        "top": ((0, -0.02, 1.6), (0, -0.02, 0.2)),
    }
    for tag, (loc, look) in views.items():
        cam = add_camera(f"cam_{tag}", loc, look)
        scene.camera = cam
        scene.render.filepath = os.path.join(OUT_DIR, f"render_{tag}.png")
        bpy.ops.render.render(write_still=True)


# -------------------------------------------------------------------- main

def main():
    reset_scene()
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.unit_settings.system = "METRIC"

    mat_body = make_material("poopm_body", BODY_COLOR, BODY_ROUGH)
    mat_limb = make_material("poopm_limb", LIMB_COLOR, LIMB_ROUGH)
    mat_face = make_face_material()

    arm_obj = build_armature()

    body = build_body(mat_body)
    weight_body(body)
    skin(body, arm_obj)

    limbs = [
        ("arm_L", ARM_L, ARM_RADII, "b_upperarm_L", "b_forearm_L"),
        ("arm_R", ARM_R, ARM_RADII, "b_upperarm_R", "b_forearm_R"),
        ("leg_L", LEG_L, LEG_RADII, "b_thigh_L", "b_shin_L"),
        ("leg_R", LEG_R, LEG_RADII, "b_thigh_R", "b_shin_R"),
    ]
    for name, chain, radii, bone_a, bone_b in limbs:
        obj, path = build_limb(name, chain, radii, mat_limb)
        # joint index in subdivided path: segments split at index 4? -> find
        # ring closest to chain[1]
        joint = min(range(len(path)),
                    key=lambda i: (Vector(path[i]) - Vector(chain[1])).length)
        weight_tube(obj, path, bone_a, bone_b, joint)
        skin(obj, arm_obj)

    for side, wrist, sign in (("L", ARM_L[-1], 1.0), ("R", ARM_R[-1], -1.0)):
        obj, franges = build_hand(f"hand_{side}", wrist, sign, mat_limb)
        weight_hand(obj, wrist, sign, franges, side)
        skin(obj, arm_obj)
    for side, spec in (("L", FOOT_L), ("R", FOOT_R)):
        obj = build_foot(f"foot_{side}", spec, mat_limb)
        rigid_to(obj, f"b_foot_{side}")
        skin(obj, arm_obj)

    eye = curved_plate("eye", **EYE_PLATE)
    mouth = curved_plate("mouth", **MOUTH_PLATE)
    for plate in (eye, mouth):
        plate.data.materials.append(mat_face)
        # 透明プレートが胴体に影を落とさないようにする
        try:
            plate.visible_shadow = False
        except AttributeError:
            pass
        bone_parent(plate, arm_obj, "b_face")

    head_acc = bpy.data.objects.new("head_acc", None)
    bpy.context.scene.collection.objects.link(head_acc)
    head_acc.location = (0.03, -0.02, 0.56)
    bone_parent(head_acc, arm_obj, "b_head_acc")

    build_animations(arm_obj)

    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    kwargs = dict(
        filepath=GLB_PATH,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_apply=True,
        export_skins=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    try:
        bpy.ops.export_scene.gltf(export_animation_mode="ACTIONS", **kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    print(f"[poopm-3d] exported {GLB_PATH}")

    render_previews()
    print(f"[poopm-3d] previews -> {OUT_DIR}")


if __name__ == "__main__":
    main()
