import { useEffect, useReducer, useState } from 'react';
import { stars, starPosition } from '../data/stars';
import { getSolarBody } from '../data/solarSystem';
import { DEFAULT_DAYS_PER_SECOND, type SolarScale } from '../lib/solarSystem';

export type Mode = 'galaxy' | 'local' | 'solar';
export interface ExplorerState {
  mode: Mode;
  selectedId: string | null;
  moving: boolean;
  labels: boolean;
  grid: boolean;
  dust: boolean;
  quality: 'low' | 'high';
  reset: number;
  solarScale: SolarScale;
  compareSun: boolean;
  moon: boolean;
  orbits: boolean;
  speed: number;
  follow: boolean;
}
export type ExplorerAction =
  | { type: 'mode'; mode: Mode }
  | { type: 'select'; id: string }
  | { type: 'focus-current'; id: string }
  | { type: 'close' }
  | { type: 'reset' }
  | {
      type: 'toggle';
      key: 'moving' | 'labels' | 'grid' | 'dust' | 'moon' | 'orbits' | 'compareSun' | 'follow';
    }
  | { type: 'quality'; quality: 'low' | 'high' }
  | { type: 'reduce' }
  | { type: 'scale'; scale: SolarScale }
  | { type: 'speed'; speed: number };

export const initialExplorerState: ExplorerState = {
  mode: 'galaxy',
  selectedId: null,
  moving: true,
  labels: true,
  grid: false,
  dust: true,
  quality: 'high',
  reset: 0,
  solarScale: 'explore',
  compareSun: false,
  moon: false,
  orbits: true,
  speed: DEFAULT_DAYS_PER_SECOND,
  follow: true,
};

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'mode':
      return { ...state, mode: action.mode, selectedId: null, reset: state.reset + 1 };
    case 'select': {
      const body = getSolarBody(action.id);
      if (body && (body.id !== 'sun' || state.mode !== 'local')) {
        return {
          ...state,
          selectedId: body.id,
          mode: 'solar',
          moon: body.id === 'moon' ? true : state.moon,
          compareSun: body.id === 'sun' && state.solarScale === 'size' ? true : state.compareSun,
          follow: true,
          reset: state.reset + 1,
        };
      }
      const star = stars.find((s) => s.id === action.id);
      if (!star) return state;
      return {
        ...state,
        selectedId: star.id,
        mode: star.id !== 'sun' && starPosition(star) ? 'local' : state.mode,
        reset: state.reset + 1,
      };
    }
    case 'close':
      return { ...state, selectedId: null };
    case 'focus-current': {
      const star = stars.find((item) => item.id === action.id);
      const body = getSolarBody(action.id);
      const available =
        state.mode === 'galaxy'
          ? action.id === 'sun'
          : state.mode === 'local'
            ? !!star && starPosition(star) !== null
            : !!body &&
              (body.id !== 'moon' || state.moon) &&
              (body.id !== 'sun' || state.solarScale !== 'size' || state.compareSun);
      return available
        ? { ...state, selectedId: action.id, follow: true, reset: state.reset + 1 }
        : state;
    }
    case 'reset':
      return { ...state, selectedId: null, reset: state.reset + 1 };
    case 'toggle': {
      const clear =
        (action.key === 'moon' && state.moon && state.selectedId === 'moon') ||
        (action.key === 'compareSun' &&
          state.compareSun &&
          state.selectedId === 'sun' &&
          state.solarScale === 'size');
      return {
        ...state,
        [action.key]: !state[action.key],
        selectedId: clear ? null : state.selectedId,
      };
    }
    case 'quality':
      return { ...state, quality: action.quality };
    case 'reduce':
      return { ...state, moving: false };
    case 'scale':
      return {
        ...state,
        solarScale: action.scale,
        selectedId:
          state.selectedId === 'sun' && action.scale === 'size' && !state.compareSun
            ? null
            : state.selectedId,
        reset: state.reset + 1,
      };
    case 'speed':
      return Number.isFinite(action.speed) && action.speed > 0 && action.speed <= 20
        ? { ...state, speed: action.speed }
        : state;
  }
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useExplorer() {
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(explorerReducer, {
    ...initialExplorerState,
    mode: 'galaxy',
    selectedId: null,
    moving: !reduced,
    labels: true,
    grid: false,
    dust: true,
    quality: window.innerWidth < 768 || (navigator.hardwareConcurrency || 4) <= 4 ? 'low' : 'high',
    reset: 0,
  });
  useEffect(() => {
    if (reduced) dispatch({ type: 'reduce' });
  }, [reduced]);
  return { state, dispatch, reduced };
}
