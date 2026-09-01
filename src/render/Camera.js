export class Camera {
  constructor({ yaw = 0, axis = 'x', fitPadding = 0.78 } = {}) {
    this.yaw = Number(yaw);
    this.axis = String(axis).toLowerCase();
    this.fitPadding = fitPadding;
    if (!Number.isFinite(this.yaw)) throw new Error(`Invalid camera yaw: ${yaw}`);
    if (!['x', 'y', 'z'].includes(this.axis)) throw new Error(`Invalid camera axis: ${axis}. Use x, y, or z.`);
  }

  viewPoint(point, center) {
    let x = point[0] - center[0];
    let y = point[1] - center[1];
    let z = point[2] - center[2];
    const angle = this.yaw * Math.PI / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    if (this.axis === 'x') {
      const a = y * c - z * s;
      const b = y * s + z * c;
      return [b, a, x];
    }
    if (this.axis === 'y') {
      const a = x * c + z * s;
      const b = -x * s + z * c;
      return [a, b, y];
    }
    const a = x * c - y * s;
    const b = x * s + y * c;
    return [a, b, z];
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
