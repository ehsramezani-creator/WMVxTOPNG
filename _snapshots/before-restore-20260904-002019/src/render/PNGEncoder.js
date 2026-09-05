import { deflateSync } from 'node:zlib';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

export function encodeRGBA(width, height, pixels) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new RangeError('Invalid PNG dimensions');
  if (!pixels || pixels.length !== width * height * 4) throw new RangeError('RGBA pixel buffer has invalid length');
  const rowSize = width * 4;
  const scanlines = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    const dst = y * (rowSize + 1);
    scanlines[dst] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * rowSize, rowSize).copy(scanlines, dst + 1);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0))]);
}

export default encodeRGBA;
