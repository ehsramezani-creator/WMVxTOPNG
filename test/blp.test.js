import test from 'node:test';
import assert from 'node:assert/strict';
import { BLPDecoder } from '../src/index.js';

function makeBLP2DXT1() {
  const b = Buffer.alloc(156);
  b.write('BLP2', 0, 'ascii');
  b.writeUInt32LE(2, 4);
  b[8] = 0;
  b[9] = 0;
  b[10] = 1;
  b.writeUInt32LE(4, 12);
  b.writeUInt32LE(4, 16);
  b.writeUInt32LE(148, 20);
  b.writeUInt32LE(8, 84);
  b.writeUInt16LE(0xffff, 148);
  b.writeUInt16LE(0xffff, 150);
  b.writeUInt32LE(0, 152);
  return b;
}

test('BLP2 DXT1 decoder returns RGBA pixels', () => {
  const result = new BLPDecoder().decode(makeBLP2DXT1());
  assert.equal(result.width, 4);
  assert.equal(result.height, 4);
  assert.equal(result.channels, 4);
  assert.equal(result.pixels.length, 64);
  assert.deepEqual([...result.pixels.subarray(0, 4)], [255, 255, 255, 255]);
});
