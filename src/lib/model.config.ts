/**
 * Swap the placeholder for the real Blender export by changing `modelUrl` only.
 * GLB naming contract: U1..U8 / L1..L8 with _plain, _window, _deepcut, optional _base.
 */
export const modelConfig = {
  /** One-line swap: set to '/models/jmcanboy-arch.glb' when the asset is ready. */
  modelUrl: null as string | null,
  usePlaceholder: true,
  maxFileMb: 3,
  camera: {
    position: [0, 0.15, 2.4] as [number, number, number],
    fov: 35,
    minDistance: 1.4,
    maxDistance: 4,
  },
} as const;
