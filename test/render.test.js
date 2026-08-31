import test from 'node:test';
import assert from 'node:assert/strict';
import { SoftwareRenderer } from '../src/render/SoftwareRenderer.js';
import { encodeRGBA } from '../src/render/PNGEncoder.js';

test('SoftwareRenderer rasterizes a triangle', () => {
  const model = {
    vertices: [
      { position: [-1, 0, -1] },
      { position: [1, 0, -1] },
      { position: [0, 0, 1] },
    ],
    indices: new Uint32Array([0, 1, 2]),
  };
  const image = new SoftwareRenderer({ width: 32, height: 32 }).render(model);
  assert.equal(image.pixels.length, 32 * 32 * 4);
  assert.ok([...image.pixels].some((v, i) => i % 4 === 0 && v !== 24));
});

test('PNG encoder writes PNG signature', () => {
  const pixels = new Uint8Array([255, 0, 0, 255]);
  const png = encodeRGBA(1, 1, pixels);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
