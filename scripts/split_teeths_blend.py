"""
Split teeths_blend.blend lowpoly arches into U1–U8 / L1–L8 + gums, export Draco GLB.
"""
from __future__ import annotations

import json
import math
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
REPORT = Path(r"C:\Users\user\Documents\Jmcanboy Jewelry\scripts\teeths-blend-split-report.json")


def mesh_data_name(obj: bpy.types.Object) -> str:
    return obj.data.name if obj.type == "MESH" and obj.data else obj.name


def load_image(path: Path, colorspace: str) -> bpy.types.Image:
    img = bpy.data.images.load(str(path), check_existing=True)
    img.reload()
    if max(img.size) > 1024:
        img.scale(1024, 1024)
    img.colorspace_settings.name = colorspace
    img.pack()
    return img


def rebuild_teeths_material() -> None:
    diffuse_path = SRC_DIR / "teeth_diffuse.png"
    if not diffuse_path.exists():
        diffuse_path = SRC_DIR / "teeth_diffuse.jpg"
    normal_path = SRC_DIR / "teeth_normal.png"
    if not normal_path.exists():
        normal_path = SRC_DIR / "teeth_normal.jpg"

    mat = bpy.data.materials.get("Teeths") or bpy.data.materials.new("Teeths")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    if diffuse_path.exists():
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = load_image(diffuse_path, "sRGB")
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if normal_path.exists():
        tex_n = nt.nodes.new("ShaderNodeTexImage")
        tex_n.image = load_image(normal_path, "Non-Color")
        nrm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(tex_n.outputs["Color"], nrm.inputs["Color"])
        nt.links.new(nrm.outputs["Normal"], bsdf.inputs["Normal"])
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.38

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)


def world_bounds(objs: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for obj in objs:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            mins = Vector((min(mins.x, world.x), min(mins.y, world.y), min(mins.z, world.z)))
            maxs = Vector((max(maxs.x, world.x), max(maxs.y, world.y), max(maxs.z, world.z)))
    return mins, maxs


def centroid(obj: bpy.types.Object) -> Vector:
    acc = Vector((0, 0, 0))
    n = len(obj.data.vertices) or 1
    for v in obj.data.vertices:
        acc += obj.matrix_world @ v.co
    return acc / n


def separate_loose(obj: bpy.types.Object) -> list[bpy.types.Object]:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    # All selected after separate
    return [o for o in bpy.context.selected_objects if o.type == "MESH"]


def rename_teeth(parts: list[bpy.types.Object], prefix: str) -> dict:
    """
    Pick the 8 true crowns: filter tiny dust, then take the 8 most radially
    outward parts (teeth sit on the arch rim; scrap often sits inward).
    Sort L→R as 1→8. Returns {names, kept_verts, scrap_count}.
    """
    if not parts:
        return {"names": [], "kept_verts": [], "scrap_count": 0}

    # Drop microscopic dust
    viable = [o for o in parts if len(o.data.vertices) >= 80]
    if len(viable) < 8:
        viable = sorted(parts, key=lambda o: len(o.data.vertices), reverse=True)[: max(8, len(parts))]

    # Arch center from all viable centroids
    center = Vector((0, 0, 0))
    for o in viable:
        center += centroid(o)
    center /= len(viable)

    def radial(o: bpy.types.Object) -> float:
        c = centroid(o)
        # Horizontal radius in XZ (Blender) — crowns sit on the ring
        return math.hypot(c.x - center.x, c.z - center.z)

    # Prefer outer rim; among similar radius, prefer mid-size (not huge palate chunks)
    scored = sorted(
        viable,
        key=lambda o: (radial(o), -abs(len(o.data.vertices) - 2000)),
        reverse=True,
    )
    keep = scored[:8]
    scrap = [o for o in parts if o not in keep]
    for obj in scrap:
        bpy.data.objects.remove(obj, do_unlink=True)

    ranked = sorted(keep, key=lambda o: centroid(o).x)
    names: list[str] = []
    kept_verts: list[int] = []
    for i, obj in enumerate(ranked):
        name = f"{prefix}{i + 1}"
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
        obj.name = name
        if obj.data:
            obj.data.name = name
        names.append(name)
        kept_verts.append(len(obj.data.vertices))
    return {"names": names, "kept_verts": kept_verts, "scrap_count": len(scrap)}


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(SRC))
    rebuild_teeths_material()

    # Keep lowpoly meshes only
    keep_names = []
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        md = mesh_data_name(obj)
        if "Lowpoly" not in md:
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        # Rename objects to mesh data names for clarity
        if obj.name != md:
            obj.name = md
        keep_names.append(obj.name)

    teeth_up = bpy.data.objects.get("Teeths_Up_Lowpoly")
    teeth_down = bpy.data.objects.get("Teeths_Down_Lowpoly")
    gums_up = bpy.data.objects.get("Gums_Up_Lowpoly")
    gums_down = bpy.data.objects.get("Gums_Down_Lowpoly")

    if gums_up:
        gums_up.name = "Gums_Up"
        if gums_up.data:
            gums_up.data.name = "Gums_Up"
    if gums_down:
        gums_down.name = "Gums_Down"
        if gums_down.data:
            gums_down.data.name = "Gums_Down"

    info_u: dict = {"names": [], "kept_verts": [], "scrap_count": 0}
    info_l: dict = {"names": [], "kept_verts": [], "scrap_count": 0}
    if teeth_up:
        parts = separate_loose(teeth_up)
        info_u = rename_teeth(parts, "U")
    if teeth_down:
        parts = separate_loose(teeth_down)
        info_l = rename_teeth(parts, "L")

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]

    # Normalize: center + uniform scale only. App applies smile-facing rotation.
    mins, maxs = world_bounds(meshes)
    center = (mins + maxs) * 0.5
    size = max(maxs - mins) or 1.0
    scale = 2.2 / size
    xform = Matrix.Scale(scale, 4) @ Matrix.Translation(-center)

    for obj in meshes:
        obj.parent = None
        obj.matrix_world = xform @ obj.matrix_world

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    if meshes:
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        # Re-set origins after bake
        for obj in meshes:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    if meshes:
        bpy.context.view_layer.objects.active = meshes[0]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()

    # Skip Draco for reliable texture binding in drei/three locally
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
        export_draco_mesh_compression_enable=False,
    )
    draco = False

    data = OUT.read_bytes()
    json_len = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20 : 20 + json_len].decode("utf-8"))

    report = {
        "out_mb": round(OUT.stat().st_size / (1024 * 1024), 2),
        "draco": draco,
        "upper": info_u,
        "lower": info_l,
        "nodes": [n.get("name") for n in gltf.get("nodes", [])],
        "gltf_images": len(gltf.get("images", [])),
        "mesh_count": len(gltf.get("meshes", [])),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, **report}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        raise
