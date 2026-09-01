import Camera from './Camera.js';

export class SoftwareRenderer {
  constructor({ width = 512, height = 512, background = [0, 0, 0, 0], cameraYaw = 0, cameraAxis = 'x', cameraAzimuth = null, cameraElevation = 0, cameraRadius = 5, cameraFitPadding = 0.78 } = {}) {
    this.width = width;
    this.height = height;
    this.background = background;
    this.cameraAzimuth = cameraAzimuth == null ? cameraYaw : Number(cameraAzimuth);
    this.cameraElevation = Number(cameraElevation);
    this.cameraRadius = Number(cameraRadius);
    this.cameraFitPadding = Number(cameraFitPadding);
    this.camera = new Camera({ radius: this.cameraRadius, azimuth: this.cameraAzimuth, elevation: this.cameraElevation, fitPadding: this.cameraFitPadding });
    this.cameraYaw = this.cameraAzimuth;
    this.cameraAxis = String(cameraAxis).toLowerCase();
  }

  render(model) {
    if (!model?.vertices?.length) throw new Error('Model vertices are required');
    if (!model?.indices?.length) throw new Error('Model indices are required');
    const pixels = new Uint8Array(this.width * this.height * 4);
    const depth = new Float64Array(this.width * this.height);
    depth.fill(Infinity);
    for (let i = 0; i < pixels.length; i += 4) pixels.set(this.background, i);

    const positions = model.vertices.map(v => v.position);
    const projected = this.camera.project(positions, this.width, this.height);

    const batches = Array.isArray(model.batches) && model.batches.length ? model.batches : [{ index: 0, firstIndex: 0, indexCount: model.indices.length }];
    for (const batch of batches) {
      const first = batch.firstIndex ?? batch.submesh?.firstIndex ?? 0;
      const count = batch.indexCount ?? batch.submesh?.indexCount ?? model.indices.length - first;
      const material = model.materials?.[batch.index ?? 0] ?? null;
      const blendMode = material?.blendMode ?? 0;
      const renderFlags = material?.renderFlags?.flags ?? 0;
      const noZWrite = material?.noZWrite === true || (renderFlags & 0x10) !== 0;
      for (let i = first; i + 2 < first + count && i + 2 < model.indices.length; i += 3) {
        const ia = model.indices[i], ib = model.indices[i + 1], ic = model.indices[i + 2];
        const a0 = projected[ia], b0 = projected[ib], c0 = projected[ic];
        if (!a0 || !b0 || !c0 || Math.abs(edge(a0, b0, c0)) < 1e-8) continue;
        const a = [a0[0], a0[1], a0[2], model.vertices[ia]?.texCoord?.[0] ?? 0, model.vertices[ia]?.texCoord?.[1] ?? 0];
        const b = [b0[0], b0[1], b0[2], model.vertices[ib]?.texCoord?.[0] ?? 0, model.vertices[ib]?.texCoord?.[1] ?? 0];
        const cc = [c0[0], c0[1], c0[2], model.vertices[ic]?.texCoord?.[0] ?? 0, model.vertices[ic]?.texCoord?.[1] ?? 0];
        this.#triangle(pixels, depth, a, b, cc, material?.image ?? null, blendMode, noZWrite);
      }
    }
    return { width: this.width, height: this.height, pixels };
  }

  #triangle(pixels, depth, a, b, c, image, blendMode, noZWrite) {
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), maxX = Math.min(this.width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), maxY = Math.min(this.height - 1, Math.ceil(Math.max(a[1], b[1], c[1]))), area = edge(a, b, c);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const p = [x + 0.5, y + 0.5, 0], w0 = edge(b, c, p) / area, w1 = edge(c, a, p) / area, w2 = edge(a, b, p) / area;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * a[2] + w1 * b[2] + w2 * c[2], index = y * this.width + x;
      if (z > depth[index]) continue;
      let r = 210, g = 210, bch = 210, alpha = 255;
      if (image?.pixels?.length && image.width && image.height) {
        let u = w0 * a[3] + w1 * b[3] + w2 * c[3], v = w0 * a[4] + w1 * b[4] + w2 * c[4];
        u = ((u % 1) + 1) % 1; v = ((v % 1) + 1) % 1;
        const tx = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width))), ty = Math.min(image.height - 1, Math.max(0, Math.floor(v * image.height))), ti = (ty * image.width + tx) * 4;
        r = image.pixels[ti]; g = image.pixels[ti + 1]; bch = image.pixels[ti + 2]; alpha = image.pixels[ti + 3];
      }
      const o = index * 4, dr = pixels[o], dg = pixels[o + 1], db = pixels[o + 2], da = pixels[o + 3], sa = alpha / 255, daN = da / 255;
      if (blendMode === 1) { if (sa < 0.7) continue; pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = bch; pixels[o + 3] = 255; }
      else if (blendMode === 2) { pixels[o] = Math.round(r * sa + dr * (1 - sa)); pixels[o + 1] = Math.round(g * sa + dg * (1 - sa)); pixels[o + 2] = Math.round(bch * sa + db * (1 - sa)); pixels[o + 3] = Math.round((sa + daN * (1 - sa)) * 255); }
      else if (blendMode === 3) { pixels[o] = Math.min(255, Math.round(r * (r / 255) + dr)); pixels[o + 1] = Math.min(255, Math.round(g * (g / 255) + dg)); pixels[o + 2] = Math.min(255, Math.round(bch * (bch / 255) + db)); pixels[o + 3] = 255; }
      else if (blendMode === 4) { pixels[o] = Math.min(255, Math.round(r * sa + dr)); pixels[o + 1] = Math.min(255, Math.round(g * sa + dg)); pixels[o + 2] = Math.min(255, Math.round(bch * sa + db)); pixels[o + 3] = 255; }
      else if (blendMode === 5 || blendMode === 6) { pixels[o] = Math.min(255, Math.round(2 * dr * r / 255)); pixels[o + 1] = Math.min(255, Math.round(2 * dg * g / 255)); pixels[o + 2] = Math.min(255, Math.round(2 * db * bch / 255)); pixels[o + 3] = 255; }
      else if (blendMode === 7) { pixels[o] = Math.min(255, Math.round(r + dr * (1 - sa))); pixels[o + 1] = Math.min(255, Math.round(g + dg * (1 - sa))); pixels[o + 2] = Math.min(255, Math.round(bch + db * (1 - sa))); pixels[o + 3] = 255; }
      else { pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = bch; pixels[o + 3] = alpha; }
      if (!noZWrite) depth[index] = z;
    }
  }
}
function edge(a, b, p) { return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]); }
export default SoftwareRenderer;
