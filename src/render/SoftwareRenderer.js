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
    const scale = Math.min(this.width, this.height) * 0.78 / span;
    const projected = positions.map(p => [
      this.width * 0.5 + (p[0] - center[0]) * scale,
      this.height * 0.5 - (p[2] - center[2]) * scale,
      -(p[1] - center[1]) / span,
    ]);

    const batches = Array.isArray(model.batches) && model.batches.length
      ? model.batches
      : [{ index: 0, firstIndex: 0, indexCount: model.indices.length }];

    for (const batch of batches) {
      const first = batch.firstIndex ?? batch.submesh?.firstIndex ?? 0;
      const count = batch.indexCount ?? batch.submesh?.indexCount ?? model.indices.length - first;
      const material = model.materials?.[batch.index ?? 0] ?? null;
      const renderFlags = material?.renderFlags?.flags ?? 0;
      const blendMode = material?.blendMode ?? 0;

      // WMVx converts WoW's Y-up coordinates with yUpToZUp(): (x, z, -y).
      // Its default OpenGL depth test is GL_LESS, so the transformed Z is
      // the depth value that must be compared here.
      const cull = material?.cull === true || (renderFlags & 0x4) === 0;
      const noZWrite = material?.noZWrite === true || (renderFlags & 0x10) !== 0;

      for (let i = first; i + 2 < first + count && i + 2 < model.indices.length; i += 3) {
        const ia = model.indices[i];
        const ib = model.indices[i + 1];
        const ic = model.indices[i + 2];
        const a0 = projected[ia], b0 = projected[ib], c0 = projected[ic];
        if (!a0 || !b0 || !c0) continue;

        const area = edge(a0, b0, c0);
        if (Math.abs(area) < 1e-8) continue;
        if (cull && area <= 0) continue;

        const a = [a0[0], a0[1], a0[2], model.vertices[ia]?.texCoord?.[0] ?? 0, model.vertices[ia]?.texCoord?.[1] ?? 0];
        const b = [b0[0], b0[1], b0[2], model.vertices[ib]?.texCoord?.[0] ?? 0, model.vertices[ib]?.texCoord?.[1] ?? 0];
        const c = [c0[0], c0[1], c0[2], model.vertices[ic]?.texCoord?.[0] ?? 0, model.vertices[ic]?.texCoord?.[1] ?? 0];
        this.#triangle(pixels, depth, a, b, c, material?.image ?? null, blendMode, noZWrite);
      }
    }

    return { width: this.width, height: this.height, pixels };
  }

  #triangle(pixels, depth, a, b, c, image, blendMode, noZWrite) {
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const area = edge(a, b, c);

    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const p = [x + 0.5, y + 0.5, 0];
      const w0 = edge(b, c, p) / area;
      const w1 = edge(c, a, p) / area;
      const w2 = edge(a, b, p) / area;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
      const index = y * this.width + x;
      if (z > depth[index]) continue;

      let r = 210, g = 210, bch = 210, alpha = 255;
      if (image?.pixels?.length && image.width && image.height) {
        // WMVx passes the M2 UV directly to OpenGL. Its BLP upload path does
        // not vertically flip the decoded image, so v=0 samples the first row.
        let u = w0 * a[3] + w1 * b[3] + w2 * c[3];
        let v = w0 * a[4] + w1 * b[4] + w2 * c[4];
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;

        const tx = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width)));
        const ty = Math.min(image.height - 1, Math.max(0, Math.floor(v * image.height)));
        const ti = (ty * image.width + tx) * 4;
        r = image.pixels[ti];
        g = image.pixels[ti + 1];
        bch = image.pixels[ti + 2];
        alpha = image.pixels[ti + 3];
      }

      const o = index * 4;
      const dr = pixels[o], dg = pixels[o + 1], db = pixels[o + 2], da = pixels[o + 3];
      const sa = alpha / 255;
      const daN = da / 255;

      if (blendMode === 1) {
        if (sa < 0.7) continue;
        pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = bch; pixels[o + 3] = 255;
      } else if (blendMode === 2) {
        pixels[o] = Math.round(r * sa + dr * (1 - sa));
        pixels[o + 1] = Math.round(g * sa + dg * (1 - sa));
        pixels[o + 2] = Math.round(bch * sa + db * (1 - sa));
        pixels[o + 3] = Math.round((sa + daN * (1 - sa)) * 255);
      } else if (blendMode === 3) {
        pixels[o] = Math.min(255, Math.round(r * (r / 255) + dr));
        pixels[o + 1] = Math.min(255, Math.round(g * (g / 255) + dg));
        pixels[o + 2] = Math.min(255, Math.round(bch * (bch / 255) + db));
        pixels[o + 3] = 255;
      } else if (blendMode === 4) {
        pixels[o] = Math.min(255, Math.round(r * sa + dr));
        pixels[o + 1] = Math.min(255, Math.round(g * sa + dg));
        pixels[o + 2] = Math.min(255, Math.round(bch * sa + db));
        pixels[o + 3] = 255;
      } else if (blendMode === 5 || blendMode === 6) {
        pixels[o] = Math.min(255, Math.round(2 * dr * r / 255));
        pixels[o + 1] = Math.min(255, Math.round(2 * dg * g / 255));
        pixels[o + 2] = Math.min(255, Math.round(2 * db * bch / 255));
        pixels[o + 3] = 255;
      } else if (blendMode === 7) {
        pixels[o] = Math.min(255, Math.round(r + dr * (1 - sa)));
        pixels[o + 1] = Math.min(255, Math.round(g + dg * (1 - sa)));
        pixels[o + 2] = Math.min(255, Math.round(bch + db * (1 - sa)));
        pixels[o + 3] = 255;
      } else {
        pixels[o] = r;
        pixels[o + 1] = g;
        pixels[o + 2] = bch;
        pixels[o + 3] = alpha;
      }

      if (!noZWrite) depth[index] = z;
    }
  }
}

function edge(a, b, p) {
  return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
}

export default SoftwareRenderer;
