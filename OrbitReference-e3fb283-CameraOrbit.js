export const DEFAULT_ORBIT_PATTERN = [
  { elevation: 0, count: 12 },
  { elevation: 30, count: 8 },
  { elevation: 45, count: 6 },
  { elevation: 60, count: 4 },
  { elevation: 90, count: 1 }
];

export function buildOrbit(pattern = DEFAULT_ORBIT_PATTERN) {
  if (!Array.isArray(pattern) || !pattern.length) throw new Error('Orbit pattern must contain at least one elevation');

  const views = [];
  for (const row of pattern) {
    const elevation = Number(row.elevation);
    const count = Number(row.count);
    if (!Number.isFinite(elevation) || elevation < -90 || elevation > 90) {
      throw new Error(`Invalid elevation: ${row.elevation}`);
    }
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`Invalid image count: ${row.count}`);
    }

    for (let i = 0; i < count; i++) {
      const azimuth = count === 1 ? 0 : (360 * i) / count;
      views.push({ elevation, azimuth, index: i, count });
    }
  }
  return views;
}

export default buildOrbit;
