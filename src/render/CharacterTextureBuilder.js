const DEFAULT_LAYOUT = Object.freeze({ width: 512, height: 512 });

export const LEGACY_CHARACTER_REGIONS = Object.freeze({
  TORSO_UPPER: Object.freeze([256, 0, 256, 128]),
  LEG_UPPER: Object.freeze([256, 192, 256, 128]),
  FACE_UPPER: Object.freeze([0, 320, 256, 64]),
  FACE_LOWER: Object.freeze([0, 384, 256, 128]),
});

function sourceOver(dst, src, di, si) {
  const sa = src[si + 3] / 255;
  if (sa <= 0) return;
  const da = dst[di + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  dst[di] = Math.round((src[si] * sa + dst[di] * da * (1 - sa)) / oa);
  dst[di + 1] = Math.round((src[si + 1] * sa + dst[di + 1] * da * (1 - sa)) / oa);
  dst[di + 2] = Math.round((src[si + 2] * sa + dst[di + 2] * da * (1 - sa)) / oa);
  dst[di + 3] = Math.round(oa * 255);
}

function multiply(dst, src, di, si) {
  const sa = src[si + 3] / 255;
  if (sa <= 0) return;
  const da = dst[di + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  dst[di] = Math.round(((dst[di] * src[si] / 255) * sa + dst[di] * da * (1 - sa)) / oa);
  dst[di + 1] = Math.round(((dst[di + 1] * src[si + 1] / 255) * sa + dst[di + 1] * da * (1 - sa)) / oa);
  dst[di + 2] = Math.round(((dst[di + 2] * src[si + 2] / 255) * sa + dst[di + 2] * da * (1 - sa)) / oa);
  dst[di + 3] = Math.round(oa * 255);
}

function overlayChannel(d, s) {
  return d < 128 ? (2 * d * s) / 255 : 255 - (2 * (255 - d) * (255 - s)) / 255;
}

function overlay(dst, src, di, si) {
  const sa = src[si + 3] / 255;
  if (sa <= 0) return;
  const da = dst[di + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  const r = overlayChannel(dst[di], src[si]);
  const g = overlayChannel(dst[di + 1], src[si + 1]);
  const b = overlayChannel(dst[di + 2], src[si + 2]);
  dst[di] = Math.round((r * sa + dst[di] * da * (1 - sa)) / oa);
  dst[di + 1] = Math.round((g * sa + dst[di + 1] * da * (1 - sa)) / oa);
  dst[di + 2] = Math.round((b * sa + dst[di + 2] * da * (1 - sa)) / oa);
  dst[di + 3] = Math.round(oa * 255);
}

export class CharacterTextureBuilder {
  constructor({ width = DEFAULT_LAYOUT.width, height = DEFAULT_LAYOUT.height, regions = LEGACY_CHARACTER_REGIONS } = {}) {
    this.width = width;
    this.height = height;
    this.regions = regions;
    this.baseLayers = [];
    this.components = [];
  }

  setBaseLayer(image, blendMode = 'BLIT') {
    this.baseLayers = [];
    this.pushBaseLayer(image, blendMode);
  }

  pushBaseLayer(image, blendMode = 'BLIT') {
    if (image) this.baseLayers.push({ image, blendMode });
  }

  addLayer(image, region, layerIndex, blendMode = 'BLIT') {
    if (image) this.components.push({ image, region, layerIndex, blendMode });
  }

  build() {
    if (!this.baseLayers.length) return null;
    const pixels = new Uint8Array(this.width * this.height * 4);
    this.components.sort((a, b) => a.layerIndex - b.layerIndex);
    for (const layer of this.baseLayers) this.#merge(layer.image, [0, 0, this.width, this.height], layer.blendMode, pixels);
    for (const layer of this.components) {
      const coords = this.regions[layer.region] ?? layer.region;
      if (coords) this.#merge(layer.image, coords, layer.blendMode, pixels);
    }
    return { width: this.width, height: this.height, channels: 4, pixels };
  }

  #merge(image, coords, blendMode, dst) {
    if (!image?.pixels?.length || !image.width || !image.height) return;
    const [dx, dy, dw, dh] = coords;
    const mode = String(blendMode).toUpperCase();
    for (let y = 0; y < dh; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= this.height) continue;
      const sy = Math.min(image.height - 1, Math.floor(y * image.height / dh));
      for (let x = 0; x < dw; x++) {
        const tx = dx + x;
        if (tx < 0 || tx >= this.width) continue;
        const sx = Math.min(image.width - 1, Math.floor(x * image.width / dw));
        const si = (sy * image.width + sx) * 4;
        const di = (ty * this.width + tx) * 4;
        if (mode === 'MULTIPLY') multiply(dst, image.pixels, di, si);
        else if (mode === 'OVERLAY') overlay(dst, image.pixels, di, si);
        else sourceOver(dst, image.pixels, di, si);
      }
    }
  }
}

export default CharacterTextureBuilder;
