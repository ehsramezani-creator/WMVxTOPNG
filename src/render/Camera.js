export class Camera {
  constructor({ radius = 5, azimuth = 0, elevation = 0, fitPadding = 0.78 } = {}) {
    this.radius = Number(radius);
    this.azimuth = Number(azimuth);
    this.elevation = Number(elevation);
    this.fitPadding = Number(fitPadding);

    if (!Number.isFinite(this.radius) || this.radius <= 0) {
      throw new Error(`Invalid camera radius: ${radius}`);
    }
    if (!Number.isFinite(this.azimuth)) throw new Error(`Invalid camera azimuth: ${azimuth}`);
    if (!Number.isFinite(this.elevation) || this.elevation < -90 || this.elevation > 90) {
      throw new Error(`Invalid camera elevation: ${elevation}. Use -90 to 90.`);
    }
  }

  sphericalPosition(target = [0, 0, 0]) {
    const az = this.azimuth * Math.PI / 180;
    const el = this.elevation * Math.PI / 180;
    const cosEl = Math.cos(el);

    return [
      target[0] + this.radius * cosEl * Math.cos(az),
      target[1] + this.radius * cosEl * Math.sin(az),
      target[2] + this.radius * Math.sin(el)
    ];
  }

  viewPoint(point, center) {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    const dz = point[2] - center[2];

    const az = this.azimuth * Math.PI / 180;
    const el = this.elevation * Math.PI / 180;
    const ca = Math.cos(az), sa = Math.sin(az);
    const ce = Math.cos(el), se = Math.sin(el);

    // Camera looks toward the model. Build a stable orbit basis:
    // right = horizontal tangent, up = elevated tangent.
    const rightX = -sa;
    const rightY = ca;
    const rightZ = 0;

    const upX = -se * ca;
    const upY = -se * sa;
    const upZ = ce;

    const forwardX = -ce * ca;
    const forwardY = -ce * sa;
    const forwardZ = -se;

    const screenX = dx * rightX + dy * rightY + dz * rightZ;
    const screenY = dx * upX + dy * upY + dz * upZ;
    const depth = dx * forwardX + dy * forwardY + dz * forwardZ;

    return [screenX, screenY, depth];
  }

  project(positions, width, height) {
    if (!positions?.length) throw new Error('Camera requires model positions');

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (const p of positions) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }

    const center = min.map((v, k) => (v + max[k]) * 0.5);
    const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    const view = positions.map(point => this.viewPoint(point, center));

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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
