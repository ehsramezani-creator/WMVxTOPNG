export class Camera {
  constructor({
    radius = 5,
    azimuth = 0,
    elevation = 0,
    axis = 'x',
    fitPadding = 0.78
  } = {}) {
    this.radius = Number(radius);
    this.azimuth = Number(azimuth);
    this.elevation = Number(elevation);
    this.axis = String(axis).toLowerCase();
    this.fitPadding = Number(fitPadding);

    if (!Number.isFinite(this.radius) || this.radius <= 0) {
      throw new Error(`Invalid camera radius: ${radius}`);
    }

    if (!Number.isFinite(this.azimuth)) {
      throw new Error(`Invalid camera azimuth: ${azimuth}`);
    }

    if (!Number.isFinite(this.elevation) || this.elevation < -90 || this.elevation > 90) {
      throw new Error(`Invalid camera elevation: ${elevation}. Use -90 to 90.`);
    }

    if (!['x', 'y', 'z'].includes(this.axis)) {
      throw new Error(`Invalid camera axis: ${axis}. Use x, y, or z.`);
    }
  }

  sphericalPosition(target = [0, 0, 0]) {
    const az = this.azimuth * Math.PI / 180;
    const el = this.elevation * Math.PI / 180;
    const cosEl = Math.cos(el);

    if (this.axis === 'x') {
      return [
        target[0] + this.radius * Math.sin(el),
        target[1] + this.radius * cosEl * Math.cos(az),
        target[2] + this.radius * cosEl * Math.sin(az)
      ];
    }

    if (this.axis === 'y') {
      return [
        target[0] + this.radius * cosEl * Math.cos(az),
        target[1] + this.radius * Math.sin(el),
        target[2] + this.radius * cosEl * Math.sin(az)
      ];
    }

    return [
      target[0] + this.radius * cosEl * Math.cos(az),
      target[1] + this.radius * cosEl * Math.sin(az),
      target[2] + this.radius * Math.sin(el)
    ];
  }

  viewPoint(point, center) {
    const x = point[0] - center[0];
    const y = point[1] - center[1];
    const z = point[2] - center[2];

    const az = this.azimuth * Math.PI / 180;
    const el = this.elevation * Math.PI / 180;

    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const ce = Math.cos(el);
    const se = Math.sin(el);

    if (this.axis === 'x') {
      const screenX = y * sa + z * ca;
      const screenY = y * ca * ce - z * sa * ce + x * se;
      const depth = x * ca * ce - y * sa * se - z * ca * se;

      return [screenX, screenY, depth];
    }

    if (this.axis === 'y') {
      const screenX = x * ca + z * sa;
      const screenY = -x * sa * se + y * ce - z * ca * se;
      const depth = -x * sa * ce - z * ca * ce - y * se;

      return [screenX, screenY, depth];
    }

    const screenX = x * ca - y * sa;
    const screenY = x * sa * se + y * ca * se + z * ce;
    const depth = -x * sa * ce - y * ca * ce - z * se;

    return [screenX, screenY, depth];
  }

  project(positions, width, height) {
    if (!positions?.length) {
      throw new Error('Camera requires model positions');
    }

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    for (const p of positions) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }

    const center = min.map((v, k) => (v + max[k]) * 0.5);
    const span = Math.max(
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    ) || 1;

    const view = positions.map(point => this.viewPoint(point, center));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of view) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }

    const scale = Math.min(
      (width * this.fitPadding) / Math.max(maxX - minX, 1e-6),
      (height * this.fitPadding) / Math.max(maxY - minY, 1e-6)
    );

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    return view.map(p => [
      width * 0.5 + (p[0] - cx) * scale,
      height * 0.5 - (p[1] - cy) * scale,
      -p[2] / span
    ]);
  }
}

export default Camera;
