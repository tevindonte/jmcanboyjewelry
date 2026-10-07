'use client';

import { create } from 'zustand';
import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';

const CYCLE: ToothStyle[] = ['none', 'plain', 'window', 'deepcut'];

type BuilderState = {
  arch: ArchChoice;
  teeth: TeethMap;
  selected: ToothId[];
  setArch: (arch: ArchChoice) => void;
  selectTooth: (id: ToothId, multi?: boolean) => void;
  cycleTooth: (id: ToothId) => void;
  setStyle: (id: ToothId, style: ToothStyle) => void;
  applyStyleToSelected: (style: ToothStyle) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearStyles: () => void;
  selectTop6: () => void;
  selectBottom6: () => void;
  loadDesign: (arch: ArchChoice, teeth: TeethMap) => void;
};

function emptyTeeth(): TeethMap {
  const map: TeethMap = {};
  for (const id of toothIdsForArch('both')) {
    map[id] = 'none';
  }
  return map;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  arch: 'top',
  teeth: emptyTeeth(),
  selected: [],

  setArch: (arch) => set({ arch, selected: [] }),

  selectTooth: (id, multi = false) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    set((s) => {
      if (multi) {
        const has = s.selected.includes(id);
        return {
          selected: has ? s.selected.filter((t) => t !== id) : [...s.selected, id],
        };
      }
      return { selected: s.selected.length === 1 && s.selected[0] === id ? [] : [id] };
    });
  },

  cycleTooth: (id) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    set((s) => {
      const current = s.teeth[id] ?? 'none';
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      return {
        teeth: { ...s.teeth, [id]: next },
        selected: [id],
      };
    });
  },

  setStyle: (id, style) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    set((s) => ({ teeth: { ...s.teeth, [id]: style } }));
  },

  applyStyleToSelected: (style) => {
    set((s) => {
      const next = { ...s.teeth };
      for (const id of s.selected) {
        next[id] = style;
      }
      return { teeth: next };
    });
  },

  selectAll: () => {
    set((s) => ({ selected: toothIdsForArch(s.arch) }));
  },

  clearSelection: () => set({ selected: [] }),

  clearStyles: () => {
    set((s) => {
      const next = { ...s.teeth };
      for (const id of toothIdsForArch(s.arch)) {
        next[id] = 'none';
      }
      return { teeth: next, selected: [] };
    });
  },

  selectTop6: () => {
    set({
      selected: ['U2', 'U3', 'U4', 'U5', 'U6', 'U7'] as ToothId[],
      arch: get().arch === 'bottom' ? 'both' : get().arch,
    });
  },

  selectBottom6: () => {
    set({
      selected: ['L2', 'L3', 'L4', 'L5', 'L6', 'L7'] as ToothId[],
      arch: get().arch === 'top' ? 'both' : get().arch,
    });
  },

  loadDesign: (arch, teeth) => set({ arch, teeth: { ...emptyTeeth(), ...teeth }, selected: [] }),
}));
