import test from 'node:test';
import assert from 'node:assert/strict';
import { M2LegacyLoader, SkinLegacyLoader } from '../src/index.js';

function makeM2() {
  const b = Buffer.alloc(0x80);
  b.write('MD20', 0, 'ascii');
  b.writeUInt32LE(264, 4);
  b.writeUInt32LE(8, 8);
  b.writeUInt32LE(0x70, 12);
  b.writeUInt32LE(2, 0x44);
  b.write('TestM2', 0x70, 'ascii');
  return b;
}

function makeSkin() {
  const header = 0x30;
  const indices = header;
  const triangles = indices + 2;
  const submeshes = triangles + 6;
  const batches = submeshes + 48;
  const b = Buffer.alloc(batches + 24);
  b.write('SKIN', 0, 'ascii');
  b.writeUInt32LE(1, 0x04); b.writeUInt32LE(indices, 0x08);
  b.writeUInt32LE(3, 0x0c); b.writeUInt32LE(triangles, 0x10);
  b.writeUInt32LE(0, 0x14); b.writeUInt32LE(0, 0x18);
  b.writeUInt32LE(1, 0x1c); b.writeUInt32LE(submeshes, 0x20);
  b.writeUInt32LE(1, 0x24); b.writeUInt32LE(batches, 0x28);
  b.writeUInt32LE(1, 0x2c);
  b.writeUInt16LE(0, indices);
  b.writeUInt16LE(0, triangles); b.writeUInt16LE(1, triangles + 2); b.writeUInt16LE(2, triangles + 4);
  b.writeUInt16LE(0, submeshes); b.writeUInt16LE(0, submeshes + 2);
  b.writeUInt16LE(0, submeshes + 4); b.writeUInt16LE(3, submeshes + 6);
  b.writeUInt16LE(0, submeshes + 8); b.writeUInt16LE(3, submeshes + 10);
  return b;
}

test('M2 WotLK parser reads nViews', () => {
  const model = new M2LegacyLoader().parse(makeM2(), 'TestM2.m2');
  assert.equal(model.version, 264);
  assert.equal(model.nViews, 2);
});

test('SKIN parser reads WotLK header and sections', () => {
  const skin = new SkinLegacyLoader().parse(makeSkin());
  assert.equal(skin.header.batchesCount, 1);
  assert.equal(skin.submeshes.length, 1);
  assert.equal(skin.triangles.length, 3);
});
