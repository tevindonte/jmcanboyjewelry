import * as THREE from 'three';
import type { MetalId } from './pricing.config';

/** Cap look presets — geometry/lighting unchanged; color + roughness only. */
export const CAP_METAL_LOOK: Record<
  MetalId,
  { color: string; hoverColor: string; roughness: number; envMapIntensity: number }
> = {
  silver: {
    color: '#D4D4D8',
    hoverColor: '#e8ebf0',
    roughness: 0.14,
    envMapIntensity: 1.55,
  },
  vermeil: {
    // Warm yellow gold — keep env a hair lower so albedo reads gold, not chrome
    color: '#E6B450',
    hoverColor: '#F0C56A',
    roughness: 0.17,
    envMapIntensity: 1.15,
  },
  gold: {
    // Deeper solid gold
    color: '#DDA83E',
    hoverColor: '#E8B84A',
    roughness: 0.2,
    envMapIntensity: 1.05,
  },
};

export function applyCapMetalColor(
  mat: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
  metal: MetalId,
  opts?: { hovered?: boolean; selected?: boolean },
) {
  const look = CAP_METAL_LOOK[metal];
  const highlight = Boolean(opts?.hovered || opts?.selected);
  mat.color.set(highlight ? look.hoverColor : look.color);
  mat.metalness = 1;
  mat.roughness = highlight ? Math.max(0.12, look.roughness - 0.02) : look.roughness;
  mat.envMapIntensity = highlight ? look.envMapIntensity + 0.15 : look.envMapIntensity;
}
