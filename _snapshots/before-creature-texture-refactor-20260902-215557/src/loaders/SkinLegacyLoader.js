import fs from 'node:fs/promises';

const U16 = 2;
const SUBMESH_SIZE = 48;
const BATCH_SIZE = 24;
const HEADER_SIZE = 0x30;

function range(buffer, offset, size, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > buffer.length) {
    throw new RangeError(`${label} exceeds SKIN file: offset=0x${offset.toString(16)}, size=${size}, file=${buffer.length}`);
  }
}

export class SkinLegacyLoader {
  async load(filePath) {
    return this.parse(await fs.readFile(filePath), filePath);
  }

  parse(buffer, source = '<buffer>') {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    range(buffer, 0, HEADER_SIZE, 'SKIN header');
    if (buffer.toString('ascii', 0, 4) !== 'SKIN') throw new Error(`Invalid SKIN magic: ${source}`);

    const header = {
      magic: 'SKIN',
      indicesCount: buffer.readUInt32LE(0x04), indicesOffset: buffer.readUInt32LE(0x08),
      trianglesCount: buffer.readUInt32LE(0x0c), trianglesOffset: buffer.readUInt32LE(0x10),
      propertiesCount: buffer.readUInt32LE(0x14), propertiesOffset: buffer.readUInt32LE(0x18),
      submeshesCount: buffer.readUInt32LE(0x1c), submeshesOffset: buffer.readUInt32LE(0x20),
      batchesCount: buffer.readUInt32LE(0x24), batchesOffset: buffer.readUInt32LE(0x28),
      bonesCount: buffer.readUInt32LE(0x2c)
    };

    range(buffer, header.indicesOffset, header.indicesCount * U16, 'SKIN indices');
    const indices = new Uint16Array(header.indicesCount);
    for (let i = 0; i < indices.length; i++) indices[i] = buffer.readUInt16LE(header.indicesOffset + i * U16);

    range(buffer, header.trianglesOffset, header.trianglesCount * U16, 'SKIN triangles');
    const triangles = new Uint16Array(header.trianglesCount);
    for (let i = 0; i < triangles.length; i++) triangles[i] = buffer.readUInt16LE(header.trianglesOffset + i * U16);
    if (triangles.length % 3 !== 0) throw new Error('SKIN triangle count is not divisible by 3');

    range(buffer, header.submeshesOffset, header.submeshesCount * SUBMESH_SIZE, 'SKIN submeshes');
    const submeshes = [];
    for (let i = 0; i < header.submeshesCount; i++) {
      const o = header.submeshesOffset + i * SUBMESH_SIZE;
      submeshes.push({
        id: buffer.readUInt16LE(o),
        level: buffer.readUInt16LE(o + 2),
        vertexStart: buffer.readUInt16LE(o + 4),
        vertexCount: buffer.readUInt16LE(o + 6),
        triangleStart: buffer.readUInt16LE(o + 8),
        triangleCount: buffer.readUInt16LE(o + 10),
        boneCount: buffer.readUInt16LE(o + 12),
        boneStart: buffer.readUInt16LE(o + 14),
        boneInfluences: buffer.readUInt16LE(o + 16),
        centerBoneIndex: buffer.readUInt16LE(o + 18),
        centerPosition: [buffer.readFloatLE(o + 20), buffer.readFloatLE(o + 24), buffer.readFloatLE(o + 28)],
        sortCenterPosition: [buffer.readFloatLE(o + 32), buffer.readFloatLE(o + 36), buffer.readFloatLE(o + 40)],
        sortRadius: buffer.readFloatLE(o + 44)
      });
    }

    range(buffer, header.batchesOffset, header.batchesCount * BATCH_SIZE, 'SKIN batches');
    const batches = [];
    for (let i = 0; i < header.batchesCount; i++) {
      const o = header.batchesOffset + i * BATCH_SIZE;
      batches.push({
        flags: buffer.readUInt8(o),
        priorityPlane: buffer.readInt8(o + 1),
        shader: buffer.readUInt16LE(o + 2),
        skinSectionIndex: buffer.readUInt16LE(o + 4),
        geosetIndex: buffer.readUInt16LE(o + 6),
        colorIndex: buffer.readUInt16LE(o + 8),
        materialIndex: buffer.readUInt16LE(o + 10),
        materialLayer: buffer.readUInt16LE(o + 12),
        textureCount: buffer.readUInt16LE(o + 14),
        textureComboIndex: buffer.readUInt16LE(o + 16),
        textureCoordIndex: buffer.readUInt16LE(o + 18),
        textureWeightIndex: buffer.readUInt16LE(o + 20),
        textureTransformIndex: buffer.readUInt16LE(o + 22)
      });
    }

    // vertexStart/vertexCount address the parent M2 vertex array, not the SKIN index array.
    // triangleStart/triangleCount address the SKIN triangle array.
    for (const [i, s] of submeshes.entries()) {
      if (s.triangleStart + s.triangleCount > triangles.length) {
        throw new Error(`Submesh ${i} triangle range exceeds SKIN triangles`);
      }
    }

    return { source, header, indices, triangles, submeshes, batches };
  }
}

export default SkinLegacyLoader;
