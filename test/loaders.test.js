import test from 'node:test';
import assert from 'node:assert/strict';
import { M2LegacyLoader, SkinLegacyLoader, ModelAssembler } from '../src/index.js';

function makeM2() {
  const vertexOffset = 0x80;
  const b = Buffer.alloc(vertexOffset + 3 * 48);
  b.write('MD20', 0, 'ascii');
  b.writeUInt32LE(264, 4);
  b.writeUInt32LE(8, 8);
  b.writeUInt32LE(0x70, 12);
  b.writeUInt32LE(3, 0x3c);
  b.writeUInt32LE(vertexOffset, 0x40);
  b.writeUInt32LE(2, 0x44);
  b.write('TestM2', 0x70, 'ascii');
  for (let i = 0; i < 3; i++) {
    const o = vertexOffset + i * 48;
    b.writeFloatLE(i, o);
    b.writeFloatLE(i + 1, o + 4);
    b.writeFloatLE(i + 2, o + 8);
    b[o + 12] = 255;
    b[o + 16] = 0;
    b.writeFloatLE(0, o + 20);
    b.writeFloatLE(0, o + 24);
    b.writeFloatLE(1, o + 28);
    b.writeFloatLE(i / 2, o + 32);
    b.writeFloatLE(0, o + 36);
  }
  return b;
}

function makeSkin() {
  const header = 0x30;
  const indices = header;
  const triangles = indices + 6;
  const submeshes = triangles + 6;
  const batches = submeshes + 48;
  const b = Buffer.alloc(batches + 24);
  b.write('SKIN', 0, 'ascii');
  b.writeUInt32LE(3, 0x04); b.writeUInt32LE(indices, 0x08);
  b.writeUInt32LE(3, 0x0c); b.writeUInt32LE(triangles, 0x10);
  b.writeUInt32LE(0, 0x14); b.writeUInt32LE(0, 0x18);
  b.writeUInt32LE(1, 0x1c); b.writeUInt32LE(submeshes, 0x20);
  b.writeUInt32LE(1, 0x24); b.writeUInt32LE(batches, 0x28);
  b.writeUInt32LE(1, 0x2c);
  b.writeUInt16LE(0, indices); b.writeUInt16LE(1, indices + 2); b.writeUInt16LE(2, indices + 4);
  b.writeUInt16LE(0, triangles); b.writeUInt16LE(1, triangles + 2); b.writeUInt16LE(2, triangles + 4);
  b.writeUInt16LE(0, submeshes); b.writeUInt16LE(0, submeshes + 2);
  b.writeUInt16LE(0, submeshes + 4); b.writeUInt16LE(3, submeshes + 6);
  b.writeUInt16LE(0, submeshes + 8); b.writeUInt16LE(3, submeshes + 10);
  return b;
}

test('M2 WotLK parser reads nViews and vertices', () => {
  const model = new M2LegacyLoader().parse(makeM2(), 'TestM2.m2');
  assert.equal(model.version, 264);
  assert.equal(model.nViews, 2);
  assert.equal(model.vertices.length, 3);
  assert.deepEqual(model.vertices[1].position, [1, 2, 3]);
  assert.deepEqual(model.vertices[1].texCoord, [0.5, 0]);
});

test('SKIN parser reads WotLK header and sections', () => {
  const skin = new SkinLegacyLoader().parse(makeSkin());
  assert.equal(skin.header.batchesCount, 1);
  assert.equal(skin.submeshes.length, 1);
  assert.equal(skin.triangles.length, 3);
});

test('ModelAssembler resolves SKIN triangle indirection to M2 vertices', () => {
  const m2 = new M2LegacyLoader().parse(makeM2(), 'TestM2.m2');
  const skin = new SkinLegacyLoader().parse(makeSkin(), 'TestM2.skin');
  const model = new ModelAssembler().assemble(m2, skin);
  assert.deepEqual([...model.indices], [0, 1, 2]);
  assert.equal(model.submeshes[0].firstIndex, 0);
  assert.equal(model.submeshes[0].indexCount, 3);
  assert.equal(model.batches[0].submesh, model.submeshes[0]);
});
