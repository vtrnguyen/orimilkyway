import type { Phenomenon } from './model';

/** URLs opened and content checked against NASA/NOAA, 2026-11-09. Not an ephemeris. */
export const phenomenonSources: Record<Phenomenon, { label: string; url: string }[]> = {
  supernova: [
    { label: 'phen.source.stars', url: 'https://science.nasa.gov/universe/stars/types/' },
  ],
  blackhole: [
    {
      label: 'phen.source.blackhole',
      url: 'https://science.nasa.gov/universe/black-holes/anatomy/',
    },
  ],
  solarEclipse: [
    { label: 'phen.source.solar', url: 'https://science.nasa.gov/eclipses/types/' },
    { label: 'phen.source.safety', url: 'https://science.nasa.gov/eclipses/safety/' },
  ],
  lunarEclipse: [{ label: 'phen.source.lunar', url: 'https://science.nasa.gov/moon/eclipses/' }],
  tides: [
    {
      label: 'phen.source.tides',
      url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides03_gravity.html',
    },
    {
      label: 'phen.source.spring',
      url: 'https://oceanservice.noaa.gov/education/tutorial_tides/tides06_variations.html',
    },
  ],
};
export const stageStops: Record<Phenomenon, number[]> = {
  supernova: [0.12, 0.32, 0.5, 0.9],
  blackhole: [0, 0.25, 0.5, 0.75],
  solarEclipse: [0, 0.35, 0.5, 0.65, 1],
  lunarEclipse: [0, 0.3, 0.5, 0.7, 1],
  tides: [0, 0.25, 0.5, 0.75],
};
