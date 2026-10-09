"""Export lowpoly textured meshes from teeths_blend.blend → web GLB."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SRC_DIR = Path(
    r"C:\Users\user\Downloads\teeths_blend.rara75fbedf-87ab-46a2-90af-c9632f9ead28"
)
SRC = SRC_DIR / "teeths_blend.blend"
OUT = Path(r"C:\Users\user\Documents\Jmcanboy Jewelry\public\models\teeths-blend.glb")
REPORT = Path(r"C:\Users\user\Documents\Jmcanboy Jewelry\scripts\teeths-blend-report.json")


def mesh_data_name(obj: bpy.types.Object) -> str:
    return obj.data.name if obj.type == "MESH" and obj.data else obj.name


def load_image(path: Path, colorspace: str) -> bpy.types.Image:
    img = bpy.data.images.load(str(path), check_existing=True)
    img.reload()
    # Prefer 1024 for web weight
    w, h = img.size
    if max(w, h) > 1024:
        img.scale(1024, 1024)
    img.colorspace_settings.name = colorspace
    img.pack()
    return img


def rebuild_teeths_material() -> dict:
    diffuse_path = SRC_DIR / "teeth_diffuse.png"
    if not diffuse_path.exists():
        diffuse_path = SRC_DIR / "teeth_diffuse.jpg"
    normal_path = SRC_DIR / "teeth_normal.png"
    if not normal_path.exists():
        normal_path = SRC_DIR / "teeth_normal.jpg"

    mat = bpy.data.materials.get("Teeths")
    if not mat:
        mat = bpy.data.materials.new("Teeths")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (400, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    info = {"diffuse": None, "normal": None}
    if diffuse_path.exists():
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.location = (-400, 100)
        tex.image = load_image(diffuse_path, "sRGB")
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        info["diffuse"] = f"{diffuse_path.name} {tuple(tex.image.size)}"
    if normal_path.exists():
        tex_n = nt.nodes.new("ShaderNodeTexImage")
        tex_n.location = (-400, -200)
        tex_n.image = load_image(normal_path, "Non-Color")
        nrm = nt.nodes.new("ShaderNodeNormalMap")
        nrm.location = (-100, -200)
        nt.links.new(tex_n.outputs["Color"], nrm.inputs["Color"])
        nt.links.new(nrm.outputs["Normal"], bsdf.inputs["Normal"])
        info["normal"] = f"{normal_path.name} {tuple(tex_n.image.size)}"

    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.35

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
    return info


def world_bounds(objs: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for obj in objs:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            mins = Vector((min(mins.x, world.x), min(mins.y, world.y), min(mins.z, world.z)))
            maxs = Vector((max(maxs.x, world.x), max(maxs.y, world.y), max(maxs.z, world.z)))
    return mins, maxs


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(SRC))
    mat_info = rebuild_teeths_material()

    keep = [
        o
        for o in bpy.data.objects
        if o.type == "MESH" and "Lowpoly" in mesh_data_name(o)
    ]
    if not keep:
        keep = [o for o in bpy.data.objects if o.type == "MESH"]

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    for obj in keep:
        desired = mesh_data_name(obj)
        if obj.name != desired:
            obj.name = desired

    # Clear parents / leave identity then bake a single world matrix
    for obj in keep:
        obj.parent = None
        obj.matrix_world = obj.matrix_world.copy()

    mins, maxs = world_bounds(keep)
    center = (mins + maxs) * 0.5
    size = max(maxs - mins) or 1.0
    scale = 2.2 / size

    # -90° X: smile/labial toward camera after glTF Y-up export
    rot = Matrix.Rotation(-1.57079632679, 4, "X")
    xform = (
        Matrix.Scale(scale, 4)
        @ rot
        @ Matrix.Translation(-center)
    )

    for obj in keep:
        obj.matrix_world = xform @ obj.matrix_world

    # Bake transforms into mesh data so GLB nodes are identity + mesh
    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mins2, maxs2 = world_bounds(keep)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()

    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_yup=True,
    )

    data = OUT.read_bytes()
    json_len = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20 : 20 + json_len].decode("utf-8"))

    report = {
        "out_mb": round(OUT.stat().st_size / (1024 * 1024), 2),
        "material": mat_info,
        "gltf_images": len(gltf.get("images", [])),
        "nodes": [
            {k: n.get(k) for k in ("name", "translation", "rotation", "scale", "mesh", "children") if k in n or k == "name"}
            for n in gltf.get("nodes", [])
        ],
        "bounds_after": {"min": list(mins2), "max": list(maxs2)},
        "exported": [o.name for o in keep],
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "mb": report["out_mb"],
        "gltf_images": report["gltf_images"],
        "bounds": report["bounds_after"],
        "exported": report["exported"],
        "node_scales": [n.get("scale") for n in report["nodes"]],
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        raise
