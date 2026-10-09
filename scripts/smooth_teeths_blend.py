"""Shade-smooth the backdrop GLB and re-export (keeps fused arches)."""
from __future__ import annotations

import sys
from pathlib import Path

import bpy

SRC = Path(r"C:\Users\user\Documents\Jmcanboy Jewelry\public\models\teeths-blend.glb")
OUT = SRC  # overwrite


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SRC))

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for obj in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()
        # Clear custom split normals if any, then auto-smooth lightly
        if obj.data.has_custom_normals:
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
        # Blender 4+/5: use smooth by angle via modifier-less API
        for poly in obj.data.polygons:
            poly.use_smooth = True
        # Weighted normal-ish: merge by distance then smooth
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.remove_doubles(threshold=0.0005)
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.shade_smooth()

    if OUT.exists():
        OUT.unlink()
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=85,
        export_yup=True,
        export_draco_mesh_compression_enable=False,
    )
    print({"ok": True, "out": str(OUT), "mb": round(OUT.stat().st_size / 1e6, 2), "meshes": [m.name for m in meshes]})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print({"ok": False, "error": str(e)}, file=sys.stderr)
        raise
