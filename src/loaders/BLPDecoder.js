import { inflateSync } from 'node:zlib';

function rgb565(value) {
  return [
    Math.round(((value >> 11) & 0x1f) * 255 / 31),
    Math.round(((value >> 5) & 0x3f) * 255 / 63),
    Math.round((value & 0x1f) * 255 / 31),
  ];
}

function decodeDXT1Block(src, offset, alphaMode) {
  const c0 = src.readUInt16LE(offset);
  const c1 = src.readUInt16LE(offset + 2);
  const [r0, g0, b0] = rgb565(c0);
  const [r1, g1, b1] = rgb565(c1);
  const colors = [[r0, g0, b0, 255], [r1, g1, b1, 255]];
  if (c0 > c1 || !alphaMode) {
    colors.push([
      Math.round((2 * r0 + r1) / 3),
      Math.round((2 * g0 + g1) / 3),
      Math.round((2 * b0 + b1) / 3),
      255,
    ]);
    colors.push([
      Math.round((r0 + 2 * r1) / 3),
      Math.round((g0 + 2 * g1) / 3),
      Math.round((b0 + 2 * b1) / 3),
      255,
    ]);
  } else {
    colors.push([
      Math.round((r0 + r1) / 2),
      Math.round((g0 + g1) / 2),
      Math.round((b0 + b1) / 2),
      255,
    ]);
    colors.push([0, 0, 0, 0]);
  }
  return { colors, indices: src.readUInt32LE(offset + 4) };
}

function decodeDXT3Block(src, offset) {
  const alpha = new Array(16);
  for (let i = 0; i < 8; i++) {
    const byte = src[offset + i];
    alpha[i * 2] = (byte & 15) * 17;
    alpha[i * 2 + 1] = (byte >> 4) * 17;
  }
  return { ...decodeDXT1Block(src, offset + 8, false), alpha };
}

function decodeDXT5Block(src, offset) {
  const a0 = src[offset];
  const a1 = src[offset + 1];
  const values = [a0, a1];
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) values.push(Math.round(((7 - i) * a0 + i * a1) / 7));
  } else {
    for (let i = 1; i <= 4; i++) values.push(Math.round(((5 - i) * a0 + i * a1) / 5));
    values.push(0, 255);
  }
  let bits = 0n;
  for (let i = 0; i < 6; i++) bits |= BigInt(src[offset + 2 + i]) << BigInt(i * 8);
  const alpha = new Array(16);
  for (let i = 0; i < 16; i++) alpha[i] = values[Number((bits >> BigInt(i * 3)) & 7n)];
  return { ...decodeDXT1Block(src, offset + 8, false), alpha };
}

function decodeDXT(data, width, height, format) {
  const blockSize = format === 1 ? 8 : 16;
  const out = Buffer.alloc(width * height * 4);
  let offset = 0;
  const blocksX = Math.ceil(width / 4);
  const blocksY = Math.ceil(height / 4);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      if (offset + blockSize > data.length) throw new Error('BLP mipmap is truncated');
      const block = format === 1
        ? decodeDXT1Block(data, offset, true)
        : format === 3
          ? decodeDXT3Block(data, offset)
          : decodeDXT5Block(data, offset);
      offset += blockSize;
      for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const x = bx * 4 + px;
        const y = by * 4 + py;
        if (x >= width || y >= height) continue;
        const i = py * 4 + px;
        const color = block.colors[(block.indices >>> (i * 2)) & 3];
        const dst = (y * width + x) * 4;
        out[dst] = color[0];
        out[dst + 1] = color[1];
        out[dst + 2] = color[2];
        out[dst + 3] = block.alpha ? block.alpha[i] : color[3];
      }
    }
  }
  return out;
}

function decodePalette(data, palette, width, height, alpha) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = data[i] * 4;
    const d = i * 4;
    out[d] = palette[p + 2];
    out[d + 1] = palette[p + 1];
    out[d + 2] = palette[p];
    out[d + 3] = alpha ? ((alpha[i >> 3] >> (i & 7)) & 1) * 255 : 255;
  }
  return out;
}

function decodeRawBGRA(data, width, height) {
  if (data.length < width * height * 4) throw new Error('BLP raw mipmap is truncated');
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * 4;
    out[s] = data[s + 2];
    out[s + 1] = data[s + 1];
    out[s + 2] = data[s];
    out[s + 3] = data[s + 3];
  }
  return out;
}

export class BLPDecoder {
  decode(input) {
    const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
    if (data.length < 148) throw new Error('Invalid BLP: header is truncated');
    const magic = data.toString('ascii', 0, 4);
    if (magic !== 'BLP1' && magic !== 'BLP2') throw new Error(`Unsupported BLP magic: ${magic}`);

    const width = data.readUInt32LE(12);
    const height = data.readUInt32LE(16);
    if (!width || !height) throw new Error('Invalid BLP dimensions');

    if (magic === 'BLP2') {
      // BLP2: type at 0x04, encoding at 0x08, alphaDepth at 0x09,
      // alphaEncoding at 0x0a, mip flag at 0x0b.
      const type = data.readUInt32LE(4);
      const encoding = data[8];
      const alphaDepth = data[9];
      const alphaEncoding = data[10];
      if (type !== 1) throw new Error(`Unsupported BLP2 type: ${type}`);

      const offset = data.readUInt32LE(20);
      const size = data.readUInt32LE(84);
      if (!size) throw new Error('BLP2 has no mipmap data');
      if (offset + size > data.length) throw new Error('BLP2 mipmap is outside file');
      const mip = data.subarray(offset, offset + size);

      let pixels;
      if (encoding === 1) {
        const palette = data.subarray(148, 148 + 1024);
        if (palette.length < 1024) throw new Error('BLP2 palette is truncated');
        let alpha = null;
        if (alphaDepth === 8) alpha = mip.subarray(width * height, width * height * 2);
        else if (alphaDepth === 1) alpha = mip.subarray(width * height);
        pixels = decodePalette(mip, palette, width, height, alphaDepth === 1 ? alpha : alpha ? alpha : null);
        if (alphaDepth === 8) {
          for (let i = 0; i < width * height; i++) pixels[i * 4 + 3] = alpha[i] ?? 255;
        }
      } else if (encoding === 2) {
        const format = alphaEncoding === 7 ? 5 : alphaEncoding === 1 ? 3 : 1;
        pixels = decodeDXT(mip, width, height, format);
      } else if (encoding === 3) {
        pixels = decodeRawBGRA(mip, width, height);
      } else {
        throw new Error(`Unsupported BLP2 encoding: ${encoding}`);
      }
      return { width, height, channels: 4, pixels, format: { magic, type, encoding, alphaDepth, alphaEncoding } };
    }

    // Legacy BLP1 path retained for Warcraft III-era files.
    const compression = data.readUInt32LE(4);
    const offsetsBase = 28;
    const sizesBase = 92;
    const offset = data.readUInt32LE(offsetsBase);
    const size = data.readUInt32LE(sizesBase);
    if (offset + size > data.length) throw new Error('BLP1 mipmap is outside file');
    const mip = data.subarray(offset, offset + size);

    let pixels;
    if (compression === 1) {
      const palette = data.subarray(156, 156 + 1024);
      if (palette.length < 1024) throw new Error('BLP1 palette is truncated');
      const alphaDepth = data.readUInt32LE(8);
      const alpha = alphaDepth ? mip.subarray(width * height) : null;
      pixels = decodePalette(mip, palette, width, height, alphaDepth === 1 ? alpha : null);
    } else if (compression === 2) {
      const alphaDepth = data.readUInt32LE(8);
      const format = alphaDepth >= 8 ? 5 : alphaDepth >= 4 ? 3 : 1;
      pixels = decodeDXT(mip, width, height, format);
    } else {
      throw new Error(`Unsupported BLP1 compression: ${compression}`);
    }
    return { width, height, channels: 4, pixels, format: { magic, compression } };
  }
}

export default BLPDecoder;
