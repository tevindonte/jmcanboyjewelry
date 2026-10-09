'use client';

import { create } from 'zustand';
import type { ArchChoice, MetalId, ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';

export type GrillPreset = 'top4' | 'top6' | 'bottom6' | 'topBottom6';

const PRESET_STYLES: Record<GrillPreset, { arch: ArchChoice; ids: ToothId[]; style: ToothStyle }> =
  {
    top4: {
      arch: 'top',
      ids: ['U3', 'U4', 'U5', 'U6'],
      style: 'plain',
    },
    top6: {
      arch: 'top',
      ids: ['U2', 'U3', 'U4', 'U5', 'U6', 'U7'],
      style: 'plain',
    },
    bottom6: {
      arch: 'bottom',
      ids: ['L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
      style: 'plain',
    },
    topBottom6: {
      arch: 'both',
      ids: ['U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
      style: 'plain',
    },
  };

type BuilderState = {
  arch: ArchChoice;
  metal: MetalId;
  teeth: TeethMap;
  selected: ToothId[];
  hovered: ToothId | null;
  /** Style waiting to apply on the next tooth tap when nothing is selected. */
  pendingStyle: ToothStyle | null;
  setArch: (arch: ArchChoice) => void;
  setMetal: (metal: MetalId) => void;
  selectTooth: (id: ToothId, multi?: boolean) => void;
  /** Select a tooth; apply pendingStyle if set. */
  tapTooth: (id: ToothId) => void;
  setHovered: (id: ToothId | null) => void;
  setPendingStyle: (style: ToothStyle | null) => void;
  cycleTooth: (id: ToothId) => void;
  setStyle: (id: ToothId, style: ToothStyle) => void;
  applyStyleToSelected: (style: ToothStyle) => void;
  /** Apply style to selection, or set pending if none selected. */
  chooseStyle: (style: ToothStyle) => void;
  removeTooth: (id: ToothId) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearStyles: () => void;
  applyPreset: (preset: GrillPreset) => void;
  selectTop6: () => void;
  selectBottom6: () => void;
  loadDesign: (arch: ArchChoice, teeth: TeethMap, metal?: MetalId) => void;
};

function emptyTeeth(): TeethMap {
  const map: TeethMap = {};
  for (const id of toothIdsForArch('both')) {
    map[id] = 'none';
  }
  return map;
}

const CYCLE: ToothStyle[] = ['none', 'plain', 'window', 'deepcut'];

export const useBuilderStore = create<BuilderState>((set, get) => ({
  arch: 'top',
  metal: 'silver',
  teeth: emptyTeeth(),
  selected: [],
  hovered: null,
  pendingStyle: null,

  setArch: (arch) => set({ arch, selected: [], hovered: null }),

  setMetal: (metal) => set({ metal }),

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
      return { selected: [id] };
    });
  },

  tapTooth: (id) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    const pending = get().pendingStyle;
    set((s) => {
      const next = { ...s.teeth };
      if (pending && pending !== 'none') {
        next[id] = pending;
      }
      return {
        teeth: next,
        selected: [id],
        pendingStyle: null,
      };
    });
  },

  setHovered: (id) => set({ hovered: id }),

  setPendingStyle: (style) => set({ pendingStyle: style }),

  cycleTooth: (id) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    set((s) => {
      const current = s.teeth[id] ?? 'none';
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      return {
        teeth: { ...s.teeth, [id]: next },
        selected: [id],
        pendingStyle: null,
      };
    });
  },

  setStyle: (id, style) => {
    const allowed = toothIdsForArch(get().arch);
    if (!allowed.includes(id)) return;
    set((s) => ({
      teeth: { ...s.teeth, [id]: style },
      selected: [id],
      pendingStyle: null,
    }));
  },

  applyStyleToSelected: (style) => {
    set((s) => {
      const next = { ...s.teeth };
      for (const id of s.selected) {
        next[id] = style;
      }
      return { teeth: next, pendingStyle: null };
    });
  },

  chooseStyle: (style) => {
    const { selected } = get();
    if (selected.length === 0) {
      set({ pendingStyle: style === 'none' ? null : style });
      return;
    }
    if (selected.length === 1) {
      get().setStyle(selected[0], style);
      return;
    }
    get().applyStyleToSelected(style);
  },

  removeTooth: (id) => {
    set((s) => ({
      teeth: { ...s.teeth, [id]: 'none' },
      selected: s.selected.filter((t) => t !== id),
    }));
  },

  selectAll: () => {
    set((s) => ({ selected: toothIdsForArch(s.arch), pendingStyle: null }));
  },

  clearSelection: () => set({ selected: [], pendingStyle: null }),

  clearStyles: () => {
    set((s) => {
      const next = { ...s.teeth };
      for (const id of toothIdsForArch(s.arch)) {
        next[id] = 'none';
      }
      return { teeth: next, selected: [], pendingStyle: null, hovered: null };
    });
  },

  applyPreset: (preset) => {
    const def = PRESET_STYLES[preset];
    set((s) => {
      const next = emptyTeeth();
      // Keep styles outside the new arch cleared; apply preset styles
      for (const id of def.ids) {
        next[id] = def.style;
      }
      // Preserve other arches' styles if switching within both? Presets replace.
      void s;
      return {
        arch: def.arch,
        teeth: next,
        selected: [...def.ids],
        pendingStyle: null,
        hovered: null,
      };
    });
  },

  selectTop6: () => {
    get().applyPreset('top6');
  },

  selectBottom6: () => {
    get().applyPreset('bottom6');
  },

  loadDesign: (arch, teeth, metal = 'silver') =>
    set({
      arch,
      metal,
      teeth: { ...emptyTeeth(), ...teeth },
      selected: [],
      pendingStyle: null,
      hovered: null,
    }),
}));
