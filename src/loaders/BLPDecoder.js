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
    colors.push([Math.round((2 * r0 + r1) / 3), Math.round((2 * g0 + g1) / 3), Math.round((2 * b0 + b1) / 3), 255]);
    colors.push([Math.round((r0 + 2 * r1) / 3), Math.round((g0 + 2 * g1) / 3), Math.round((b0 + 2 * b1) / 3), 255]);
  } else {
    colors.push([Math.round((r0 + r1) / 2), Math.round((g0 + g1) / 2), Math.round((b0 + b1) / 2), 255]);
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
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4) {
      if (offset + blockSize > data.length) throw new Error('BLP mipmap is truncated');
      const block = format === 1 ? decodeDXT1Block(data, offset, true) : format === 3 ? decodeDXT3Block(data, offset) : decodeDXT5Block(data, offset);
      offset += blockSize;
      for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const x = bx + px;
        const y = by + py;
        if (x >= width || y >= height) continue;
        const i = py * 4 + px;
        const color = block.colors[(block.indices >>> (i * 2)) & 3];
        const dst = (y * width + x) * 4;
        out[dst] = color[0]; out[dst + 1] = color[1]; out[dst + 2] = color[2]; out[dst + 3] = block.alpha ? block.alpha[i] : color[3];
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
    out[d] = palette[p + 2]; out[d + 1] = palette[p + 1]; out[d + 2] = palette[p];
    out[d + 3] = alpha ? ((alpha[i >> 3] >> (i & 7)) & 1) * 255 : 255;
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
    const offsetsBase = magic === 'BLP1' ? 28 : 20;
    const sizesBase = magic === 'BLP1' ? 92 : 84;
    const offset = data.readUInt32LE(offsetsBase);
    const size = data.readUInt32LE(sizesBase);
    if (offset + size > data.length) throw new Error('BLP mipmap is outside file');
    let mip = data.subarray(offset, offset + size);
    if (magic === 'BLP2' && compression === 3) mip = inflateSync(mip);

    let pixels;
    if (compression === 1) {
      const paletteOffset = magic === 'BLP1' ? 156 : 148;
      const palette = data.subarray(paletteOffset, paletteOffset + 1024);
      if (palette.length < 1024) throw new Error('BLP palette is truncated');
      let alpha = null;
      if (magic === 'BLP1') {
        const alphaDepth = data.readUInt32LE(8);
        alpha = alphaDepth ? mip.subarray(width * height) : null;
      } else {
        const alphaDepth = data[8];
        const alphaEncoding = data[9];
        if (alphaDepth === 1 && alphaEncoding === 0) alpha = mip.subarray(width * height);
      }
      pixels = decodePalette(mip, palette, width, height, alpha);
    } else if (compression === 2) {
      let format;
      if (magic === 'BLP1') {
        const alphaDepth = data.readUInt32LE(8);
        format = alphaDepth >= 8 ? 5 : alphaDepth >= 4 ? 3 : 1;
      } else {
        const alphaEncoding = data[9];
        const alphaDepth = data[8];
        format = alphaDepth === 8 && alphaEncoding === 7 ? 5 : alphaDepth === 8 ? 3 : 1;
      }
      pixels = decodeDXT(mip, width, height, format);
    } else if (magic === 'BLP2' && compression === 3) {
      if (mip.length < width * height * 4) throw new Error('BLP raw mipmap is truncated');
      pixels = Buffer.from(mip.subarray(0, width * height * 4));
    } else {
      throw new Error(`Unsupported ${magic} compression: ${compression}`);
    }
    return { width, height, channels: 4, pixels };
  }
}

export default BLPDecoder;
