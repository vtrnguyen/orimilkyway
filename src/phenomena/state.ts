import { useEffect, useReducer } from 'react';
import {
  advanceTimeline,
  clamp,
  defaultParameters,
  type Parameters,
  type Phenomenon,
} from './model';

export interface SimulationState {
  kind: Phenomenon | null;
  progress: number;
  playing: boolean;
  speed: number;
  parameters: Parameters;
  selected: string | null;
  view: 'overview' | 'top' | 'observer';
  viewRevision: number;
}
export const initialSimulation: SimulationState = {
  kind: null,
  progress: 0,
  playing: false,
  speed: 1,
  parameters: { ...defaultParameters },
  selected: null,
  view: 'overview',
  viewRevision: 0,
};
export type SimulationAction =
  | { type: 'open'; kind: Phenomenon | null }
  | { type: 'seek'; progress: number }
  | { type: 'tick'; seconds: number }
  | { type: 'play'; playing: boolean }
  | { type: 'reset' }
  | { type: 'speed'; speed: number }
  | { type: 'select'; id: string | null }
  | { type: 'parameter'; key: keyof Parameters; value: Parameters[keyof Parameters] }
  | { type: 'view'; view: SimulationState['view'] };
export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case 'open':
      return action.kind === state.kind
        ? state
        : {
            ...initialSimulation,
            kind: action.kind,
            parameters: { ...defaultParameters, cutaway: action.kind === 'supernova' },
            progress: action.kind === 'solarEclipse' || action.kind === 'lunarEclipse' ? 0.5 : 0,
          };
    case 'seek':
      return Number.isFinite(action.progress)
        ? { ...state, progress: clamp(action.progress), playing: false }
        : state;
    case 'tick': {
      if (!state.playing || !state.kind) return state;
      // Only tides are periodic over this normalized timeline. Unequal matter
      // orbital periods must not jump back to their initial positions.
      const loop = state.kind === 'tides';
      const progress = advanceTimeline(state.progress, action.seconds, state.speed, loop);
      return { ...state, progress, playing: loop || progress < 1 };
    }
    case 'play':
      return {
        ...state,
        playing: action.playing,
        progress: action.playing && state.progress >= 1 ? 0 : state.progress,
      };
    case 'reset':
      return { ...state, progress: 0, playing: false, selected: null };
    case 'speed':
      return [0.25, 1, 2].includes(action.speed) ? { ...state, speed: action.speed } : state;
    case 'select':
      return { ...state, selected: action.id };
    case 'view':
      return { ...state, view: action.view, viewRevision: state.viewRevision + 1 };
    case 'parameter':
      return {
        ...state,
        parameters: { ...state.parameters, [action.key]: action.value },
        ...(action.key === 'solarPreset' || action.key === 'lunarPreset'
          ? { progress: 0.5, playing: false }
          : {}),
      };
  }
}
export function usePhenomena(reduced: boolean) {
  const [state, dispatch] = useReducer(simulationReducer, initialSimulation);
  useEffect(() => {
    if (reduced) dispatch({ type: 'play', playing: false });
  }, [reduced]);
  useEffect(() => {
    if (!state.kind || !state.playing || reduced) return;
    let request = 0,
      last = performance.now(),
      accumulated = 0;
    const visibility = () => {
      last = performance.now();
      accumulated = 0;
    };
    const frame = (now: number) => {
      if (!document.hidden) accumulated += (now - last) / 1000;
      last = now;
      // One UI update per 100 ms, never one update per particle. Elapsed time is not truncated.
      if (accumulated >= 0.1) {
        dispatch({ type: 'tick', seconds: accumulated });
        accumulated = 0;
      }
      request = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', visibility);
    request = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [state.kind, state.playing, reduced]);
  return { state, dispatch };
}
export type Simulation = ReturnType<typeof usePhenomena>;
