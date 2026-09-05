export const VIEW_PATTERN = [
  { elevation: 0, count: 12 },
  { elevation: 30, count: 8 },
  { elevation: 45, count: 6 },
  { elevation: 60, count: 4 },
  { elevation: 90, count: 1 }
];

export function generateViews(pattern = VIEW_PATTERN) {
  const views = [];

  for (const { elevation, count } of pattern) {
    if (!Number.isFinite(elevation)) throw new Error(`Invalid elevation: ${elevation}`);
    if (!Number.isInteger(count) || count < 1) throw new Error(`Invalid view count: ${count}`);

    const step = count === 1 ? 0 : 360 / count;
    for (let i = 0; i < count; i++) {
      views.push({
        elevation,
        azimuth: i * step
      });
    }
  }

  return views;
}

export default VIEW_PATTERN;
