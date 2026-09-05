import fs from 'node:fs/promises';

export class CameraOrbit {
  constructor(views = []) {
    this._views = views;
  }

  static async load(filePath) {
    const text = await fs.readFile(filePath, 'utf8');
    const config = JSON.parse(text);

    if (!Array.isArray(config.views)) {
      throw new Error('Camera orbit config requires a "views" array.');
    }

    const views = [];

    for (const entry of config.views) {
      const elevation = Number(entry?.elevation);
      const count = Number(entry?.count);

      if (!Number.isFinite(elevation) || elevation < -90 || elevation > 90) {
        throw new Error(`Invalid orbit elevation: ${entry?.elevation}. Use -90 to 90.`);
      }

      if (!Number.isInteger(count) || count < 1) {
        throw new Error(`Invalid orbit count: ${entry?.count}. Use an integer >= 1.`);
      }

      const step = count === 1 ? 0 : 360 / count;

      for (let i = 0; i < count; i++) {
        views.push({
          yaw: i * step,
          elevation
        });
      }
    }

    return new CameraOrbit(views);
  }

  get views() {
    return [...this._views];
  }

  get length() {
    return this._views.length;
  }
}

export default CameraOrbit;
