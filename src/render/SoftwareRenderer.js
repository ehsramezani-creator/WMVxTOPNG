export class SoftwareRenderer {
  constructor({ width = 512, height = 512, background = [24, 24, 24, 255] } = {}) {
    this.width = width;
    this.height = height;
    this.background = background;
  }

  render(model) {
    if (!model?.vertices?.length) throw new Error('Model vertices are required');
    if (!model?.indices?.length) throw new Error('Model indices are required');
    const pixels = new Uint8Array(this.width * this.height * 4);
    const depth = new Float64Array(this.width * this.height);
    depth.fill(Infinity);
    for (let i = 0; i < pixels.length; i += 4) pixels.set(this.background, i);

    const positions = model.vertices.map(v => v.position);
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of positions) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
    const center = min.map((v, k) => (v + max[k]) * 0.5);
    const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    const scale = Math.min(this.width, this.height) * 0.78 / span;

    const projected = positions.map(p => [
      this.width * 0.5 + (p[0] - center[0]) * scale,
      this.height * 0.5 - (p[2] - center[2]) * scale,
      (p[1] - center[1]) / span
    ]);

    for (let i = 0; i + 2 < model.indices.length; i += 3) {
      const a = projected[model.indices[i]], b = projected[model.indices[i + 1]], c = projected[model.indices[i + 2]];
      if (!a || !b || !c) continue;
      const area = edge(a, b, c);
      if (Math.abs(area) < 1e-8) continue;
      const shade = 0.45 + 0.55 * Math.min(1, Math.abs(area) / (span * span * scale * scale));
      this.#triangle(pixels, depth, a, b, c, shade);
    }
    return { width: this.width, height: this.height, pixels };
  }

  #triangle(pixels, depth, a, b, c, shade) {
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const area = edge(a, b, c);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const p = [x + 0.5, y + 0.5, 0];
      const w0 = edge(b, c, p) / area, w1 = edge(c, a, p) / area, w2 = edge(a, b, p) / area;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
      const index = y * this.width + x;
      if (z >= depth[index]) continue;
      depth[index] = z;
      const v = Math.max(0, Math.min(255, Math.round(210 * shade)));
      const o = index * 4;
      pixels[o] = v; pixels[o + 1] = v; pixels[o + 2] = v; pixels[o + 3] = 255;
    }
  }
}

function edge(a, b, p) { return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]); }

export default SoftwareRenderer;
