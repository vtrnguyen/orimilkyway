import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { seededRandom } from '../lib/astronomy';

/** Original procedural artwork, not spacecraft photography or measured maps.
 * Noise is evaluated on a sphere so u=0/u=1 meet without a random UV seam. */
function noise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 3.4 + Math.sin(y * 5.3) + z * 2.1) * 0.5 +
    Math.sin(y * 11.1 + Math.sin(z * 8.7) + x * 7.1) * 0.25 +
    Math.sin(z * 27.2 + x * 19.3 + y * 13.8) * 0.125
  );
}

// Coarse hand-drawn geographic silhouettes, deliberately not a cartographic map.
const continents = [
  [
    [-168, 70],
    [-130, 72],
    [-115, 58],
    [-80, 50],
    [-53, 50],
    [-60, 26],
    [-86, 9],
    [-104, 22],
    [-127, 47],
    [-160, 57],
  ],
  [
    [-81, 12],
    [-62, 10],
    [-35, -6],
    [-48, -25],
    [-68, -56],
    [-76, -26],
  ],
  [
    [-18, 34],
    [11, 37],
    [35, 30],
    [51, 11],
    [40, -13],
    [20, -35],
    [10, -32],
    [-2, 5],
    [-17, 16],
  ],
  [
    [-10, 37],
    [-10, 60],
    [20, 72],
    [50, 60],
    [90, 75],
    [150, 60],
    [178, 52],
    [140, 35],
    [123, 13],
    [104, 0],
    [82, 8],
    [70, 24],
    [45, 12],
    [35, 35],
  ],
  [
    [112, -12],
    [141, -10],
    [154, -24],
    [146, -40],
    [115, -34],
  ],
  [
    [-52, 59],
    [-20, 72],
    [-38, 83],
    [-61, 79],
  ],
];
function insidePolygon(x: number, y: number, polygon: number[][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function createBodySurface(id: string, high: boolean, clouds = false) {
  const width = high ? 512 : 256,
    height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(width, height);
  const random = seededRandom(id === 'moon' ? 708 : 313);
  const craters = Array.from({ length: 55 }, () => {
    const a = random() * Math.PI * 2,
      b = Math.acos(random() * 2 - 1);
    return {
      x: Math.sin(b) * Math.cos(a),
      y: Math.cos(b),
      z: Math.sin(b) * Math.sin(a),
      r: 0.006 + random() * 0.09,
    };
  });
  for (let row = 0; row < height; row++) {
    const lat = Math.PI / 2 - (row / (height - 1)) * Math.PI;
    for (let col = 0; col < width; col++) {
      const lon = (col / (width - 1)) * Math.PI * 2 - Math.PI;
      const x = Math.cos(lat) * Math.cos(lon),
        y = Math.sin(lat),
        z = Math.cos(lat) * Math.sin(lon);
      const n = noise(x * 2, y * 2, z * 2);
      const fine = noise(x * 9, y * 9, z * 9);
      let color: number[] = [180, 180, 180],
        alpha = 255;
      if (clouds) {
        color = [242, 247, 255];
        alpha = Math.max(0, Math.min(165, (noise(x * 4 + y, y * 5, z * 4) - 0.13) * 310));
      } else if (id === 'sun') {
        color = [255, 211 + n * 18 + fine * 5, 132 + n * 26];
      } else if (id === 'earth') {
        const land = continents.some((p) =>
          insidePolygon((lon * 180) / Math.PI, (lat * 180) / Math.PI, p),
        );
        color = land
          ? [69 + n * 24, 105 + n * 31, 65 + n * 16]
          : [21 + n * 7, 69 + n * 15, 134 + n * 23];
        if (Math.abs(lat) > 1.37 + n * 0.08) color = [220, 231, 232];
        else if (land && lat > 0.18 && lat < 0.58 && lon > -0.3 && lon < 1)
          color = [167 + n * 20, 141 + n * 13, 93];
      } else if (id === 'jupiter' || id === 'saturn') {
        const bands = Math.sin(
          lat * (id === 'jupiter' ? 30 : 45) + n * 1.2 + Math.sin(lon * 8) * 0.13,
        );
        color =
          id === 'jupiter'
            ? [195 + bands * 27 + n * 8, 164 + bands * 30 + n * 8, 133 + bands * 32]
            : [215 + bands * 10, 194 + bands * 12, 150 + bands * 12];
        if (id === 'jupiter' && ((lon - 0.35) / 0.28) ** 2 + ((lat + 0.36) / 0.12) ** 2 < 1)
          color = [172 + fine * 20, 93 + fine * 12, 65 + fine * 8];
      } else if (id === 'venus') {
        const cloud = Math.sin(lat * 13 + n * 3 + Math.sin(lon * 3));
        color = [218 + cloud * 13, 194 + cloud * 14, 145 + cloud * 16];
      } else if (id === 'uranus' || id === 'neptune') {
        const band = Math.sin(lat * 24 + n) * 3;
        color =
          id === 'uranus'
            ? [168 + band, 202 + band, 204 + band]
            : [112 + band, 161 + band, 191 + band];
      } else if (id === 'mars') {
        color = [173 + n * 38 + fine * 9, 86 + n * 28 + fine * 8, 51 + n * 20];
        if (Math.abs(lat) > 1.38 + n * 0.1) color = [215, 208, 185];
      } else {
        let gray = 139 + n * 38 + fine * 11;
        if (id === 'moon' && n < -0.14) gray -= 35;
        for (const crater of craters) {
          const d =
            Math.sqrt((x - crater.x) ** 2 + (y - crater.y) ** 2 + (z - crater.z) ** 2) / crater.r;
          if (d < 0.75) gray -= (1 - d) * 24;
          else if (d < 1) gray += Math.sin((d - 0.75) * Math.PI * 4) * 36;
        }
        color = [gray * 1.02, gray, gray * 0.98];
      }
      const offset = (row * width + col) * 4;
      pixels.data[offset] = color[0];
      pixels.data[offset + 1] = color[1];
      pixels.data[offset + 2] = color[2];
      pixels.data[offset + 3] = alpha;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 4;
  let bump: CanvasTexture | undefined;
  if (id === 'mercury' || id === 'moon' || id === 'mars') {
    bump = new CanvasTexture(canvas); // Read luminance as height, not as a color texture.
    bump.colorSpace = NoColorSpace;
    bump.wrapS = RepeatWrapping;
  }
  return { texture, bump };
}
