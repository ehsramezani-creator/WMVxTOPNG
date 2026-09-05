import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterTextureBuilder, LEGACY_CHARACTER_REGIONS } from '../src/render/CharacterTextureBuilder.js';

function image(width, height, rgba) {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set(rgba, i);
  return { width, height, pixels };
}

test('uses the WMVx WotLK character component regions', () => {
  assert.deepEqual(LEGACY_CHARACTER_REGIONS.FACE_UPPER, [0, 320, 256, 64]);
  assert.deepEqual(LEGACY_CHARACTER_REGIONS.FACE_LOWER, [0, 384, 256, 128]);
  assert.deepEqual(LEGACY_CHARACTER_REGIONS.TORSO_UPPER, [256, 0, 256, 128]);
  assert.deepEqual(LEGACY_CHARACTER_REGIONS.LEG_UPPER, [256, 192, 256, 128]);
});

test('composites base and component layers in WMVx layer order', () => {
  const builder = new CharacterTextureBuilder();
  builder.setBaseLayer(image(1, 1, [10, 20, 30, 255]));
  builder.addLayer(image(1, 1, [200, 100, 50, 255]), 'FACE_LOWER', 1);
  builder.addLayer(image(1, 1, [20, 200, 50, 255]), 'FACE_LOWER', 2);
  const result = builder.build();
  const i = (384 * 512) * 4;
  assert.deepEqual([...result.pixels.slice(i, i + 4)], [20, 200, 50, 255]);
});
