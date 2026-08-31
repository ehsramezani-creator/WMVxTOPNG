import { inflateRawSync } from 'node:zlib';

function clampByte(value) {
  return Math.max(0, Math.min(255, value | 0));
}

function rgb565(value) {
  return [
    Math.round(((value >> 11) & 0x1f) * 255 / 31),
    Math.round(((value >> 5) & 0x3f) * 255 / 63),
    Math.round((value & 0x1f) * 255 / 31),
  ];
}

function decodeDXT1Block(src, offset, alphaMode = false) {
  const c0 = src.readUInt16LE(offset);
  const c1 = src.readUInt16LE(offset + 2);
  const [r0, g0, b0] = rgb565(c0);
  const [r1, g1, b1] = rgb565(c1);
  const colors = [[r0, g0, b0, 255], [r1, g1, b1, 255]];

  if (c0 > c1 || !alphaMode) {
    colors.push([
      Math.round((2 * r0 + r1) / 3),
      Math.round((2 * g0 + g1) / 3),
      Math.round((2 * b0 + b1) / 3), 255,
    ]);
    colors.push([
      Math.round((r0 + 2 * r1) / 3),
      Math.round((g0 + 2 * g1) / 3),
      Math.round((b0 + 2 * b1) / 3), 255,
    ]);
  } else {
    colors.push([
      Math.round((r0 + r1) / 2),
      Math.round((g0 + g1) / 2),
      Math.round((b0 + b1) / 2), 255,
    ]);
    colors.push([0, 0, 0, 0]);
  }

  const indices = src.readUInt32LE(offset + 4);
  return { colors, indices };
}

function decodeDXT3Block(src, offset) {
  const alpha = new Array(16);
  for (let i = 0; i < 8; i++) {
    const byte = src[offset + i];
    alpha[i * 2] = (byte & 0x0f) * 17;
    alpha[i * 2 + 1] = (byte >> 4) * 17;
  }
  const block = decodeDXT1Block(src, offset + 8);
  return { ...block, alpha };
}

function decodeDXT5Block(src, offset) {
  const a0 = src[offset];
  const a1 = src[offset + 1];
  const alphaValues = [a0, a1];
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) alphaValues.push(Math.round(((7 - i) * a0 + i * a1) / 7));
  } else {
    for (let i = 1; i <= 4; i++) alphaValues.push(Math.round(((5 - i) * a0 + i * a1) / 5));
    alphaValues.push(0, 255);
  }
  let bits = 0n;
  for (let i = 0; i < 6; i++) bits |= BigInt(src[offset + 2 + i]) << BigInt(i * 8);
  const alpha = new Array(16);
  for (let i = 0; i < 16; i++) alpha[i] = alphaValues[Number((bits >> BigInt(i * 3)) & 7n)];
  return { ...decodeDXT1Block(src, offset + 8), alpha };
}

function decodeDXT(data, width, height, format) {
  const bytesPerBlock = format === 1 ? 8 : 16;
  const out = Buffer.alloc(width * height * 4);
  let offset = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4) {
      const block = format === 1 ? decodeDXT1Block(data, offset, true)
        : format === 3 ? decodeDXT3Block(data, offset)
        : decodeDXT5Block(data, offset);
      offset += bytesPerBlock;
      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx + px;
          const y = by + py;
          if (x >= width || y >= height) continue;
          const i = py * 4 + px;
          const color = block.colors[(block.indices >>> (i * 2)) & 3];
          const alpha = block.alpha ? block.alpha[i] : color[3];
          const dst = (y * width + x) * 4;
          out[dst] = color[0];
          out[dst + 1] = color[1];
          out[dst + 2] = color[2];
          out[dst + 3] = alpha;
        }
      }
    }
  }
  return out;
}

function decodePaletted(data, palette, width, height, alphaBits) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const index = data[i];
    const p = index * 4;
    const dst = i * 4;
    out[dst] = palette[p + 2];
    out[dst + 1] = palette[p + 1];
    out[dst + 2] = palette[p];
    out[dst + 3] = alphaBits ? ((alphaBits[i >> 3] >> (i & 7)) & 1) * 255 : 255;
  }
  return out;
}

export class BLPDecoder {
  decode(input) {
    const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
    if (data.length < 148) throw new Error('Invalid BLP: header is truncated');
    const magic = data.toString('ascii', 0, 4);
    if (magic !== 'BLP1' && magic !== 'BLP2') throw new Error(`Unsupported BLP magic: ${magic}`);

    const compression = data.readUInt32LE(4);
    const width = data.readUInt32LE(12);
    const height = data.readUInt32LE(16);
    if (!width || !height) throw new Error('Invalid BLP dimensions');

    let pixels;
    if (magic === 'BLP1') {
      const alphaDepth = data.readUInt32LE(8);
      const offsets = Array.from({ length: 16 }, (_, i) => data.readUInt32LE(28 + i * 4));
      const sizes = Array.from({ length: 16 }, (_, i) => data.readUInt32LE(92 + i * 4));
      const offset = offsets[0];
      const size = sizes[0];
      const mip = data.subarray(offset, offset + size);
      if (compression === 1) {
        pixels = decodePaletted(mip, data.subarray(156, 156 + 1024), width, height,
          alphaDepth ? mip.subarray(width * height) : null);
      } else if (compression === 2) {
        pixels = decodeDXT(mip, width, height, alphaDepth === 8 ? 5 : alphaDepth === 4 ? 3 : 1);
      } else {
        throw new Error(`Unsupported BLP1 compression: ${compression}`);
      }
    } else {
      const alphaDepth = data[3];
      const alphaEncoding = data[2];
      const alphaBits = data[1];
      const offsets = Array.from({ length: 16 }, (_, i) => data.readUInt32LE(20 + i * 4));
      const sizes = Array.from({ length: 16 }, (_, i) => data.readUInt32LE(84 + i * 4));
      const offset = offsets[0];
      const size = sizes[0];
      const mip = data.subarray(offset, offset + size);
      if (compression === 1) {
        if (alphaEncoding === 0 || alphaDepth === 0) {
          pixels = decodePaletted(mip, data.subarray(148, 148 + 1024), width, height, null);
        } else {
          pixels = decodePaletted(mip, data.subarray(148, 148 + 1024), width, height,
            alphaBits === 1 ? mip.subarray(width * height) : null);
        }
      } else if (compression === 2) {
        const format = alphaDepth === 8 && alphaEncoding === 7 ? 5 : alphaDepth === 8 ? 3 : 1;
        pixels = decodeDXT(mip, width, height, format);
      } else {
        throw new Error(`Unsupported BLP2 compression: ${compression}`);
      }
    }

    return { width, height, channels: 4, pixels };
  }
}

export default BLPDecoder;
