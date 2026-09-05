import fs from 'node:fs/promises';

const HEADER_SIZE = 20;
const RECORD_SIZE = 112;

function range(buffer, offset, size, label) {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(size) ||
    offset < 0 ||
    size < 0 ||
    offset + size > buffer.length
  ) {
    throw new RangeError(`${label} exceeds DBC file`);
  }
}

function readCString(buffer, stringBlockOffset, stringBlockSize, offset) {
  if (!offset || offset >= stringBlockSize) return '';

  const start = stringBlockOffset + offset;
  const end = buffer.indexOf(
    0,
    start,
    stringBlockOffset + stringBlockSize
  );

  return buffer.toString(
    'utf8',
    start,
    end < 0 ? stringBlockOffset + stringBlockSize : end
  );
}

export class CreatureModelDataDBC {
  constructor(records = []) {
    this.records = records;
  }

  static async load(filePath) {
    return new CreatureModelDataDBC().load(filePath);
  }

  async load(filePath) {
    return this.parse(await fs.readFile(filePath), filePath);
  }

  parse(buffer, source = '<buffer>') {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);

    range(buffer, 0, HEADER_SIZE, 'DBC header');

    if (buffer.toString('ascii', 0, 4) !== 'WDBC') {
      throw new Error(`Invalid DBC magic: ${source}`);
    }

    const recordCount = buffer.readUInt32LE(4);
    const fieldCount = buffer.readUInt32LE(8);
    const recordSize = buffer.readUInt32LE(12);
    const stringBlockSize = buffer.readUInt32LE(16);

    if (fieldCount !== 28 || recordSize !== RECORD_SIZE) {
      throw new Error(
        `Unsupported CreatureModelData.dbc schema: fields=${fieldCount}, recordSize=${recordSize}`
      );
    }

    const recordsOffset = HEADER_SIZE;
    const stringsOffset = recordsOffset + recordCount * recordSize;

    range(
      buffer,
      recordsOffset,
      recordCount * recordSize + stringBlockSize,
      'DBC records/string block'
    );

    this.records = new Array(recordCount);

    for (let i = 0; i < recordCount; i++) {
      const o = recordsOffset + i * recordSize;

      this.records[i] = {
        id: buffer.readUInt32LE(o),
        flags: buffer.readUInt32LE(o + 4),

        modelName: readCString(
          buffer,
          stringsOffset,
          stringBlockSize,
          buffer.readUInt32LE(o + 8)
        ),

        sizeClass: buffer.readUInt32LE(o + 12),
        modelScale: buffer.readFloatLE(o + 16),

        bloodId: buffer.readUInt32LE(o + 20),
        footprintTextureId: buffer.readUInt32LE(o + 24),

        footprintTextureLength: buffer.readFloatLE(o + 28),
        footprintTextureWidth: buffer.readFloatLE(o + 32),
        footprintParticleScale: buffer.readFloatLE(o + 36),

        foleyMaterialId: buffer.readUInt32LE(o + 40),
        footstepShakeSize: buffer.readUInt32LE(o + 44),
        deathThudShakeSize: buffer.readUInt32LE(o + 48),
        soundId: buffer.readUInt32LE(o + 52),

        collisionWidth: buffer.readFloatLE(o + 56),
        collisionHeight: buffer.readFloatLE(o + 60),
        mountHeight: buffer.readFloatLE(o + 64),

        geoBoxMinX: buffer.readFloatLE(o + 68),
        geoBoxMinY: buffer.readFloatLE(o + 72),
        geoBoxMinZ: buffer.readFloatLE(o + 76),

        geoBoxMaxX: buffer.readFloatLE(o + 80),
        geoBoxMaxY: buffer.readFloatLE(o + 84),
        geoBoxMaxZ: buffer.readFloatLE(o + 88),

        worldEffectScale: buffer.readFloatLE(o + 92),
        attachedEffectScale: buffer.readFloatLE(o + 96),
        missileCollisionRadius: buffer.readFloatLE(o + 100),
        missileCollisionPush: buffer.readFloatLE(o + 104),
        missileCollisionRaise: buffer.readFloatLE(o + 108),
      };
    }

    this.source = source;
    return this;
  }

  find(id) {
    return this.records.find(record => record.id === id) ?? null;
  }

  where(predicate) {
    return this.records.filter(predicate);
  }

  findByModelName(modelName) {
    const target = String(modelName ?? '')
      .replaceAll('\\', '/')
      .toLowerCase();

    return this.records.filter(record =>
      String(record.modelName ?? '')
        .replaceAll('\\', '/')
        .toLowerCase() === target
    );
  }
}

export default CreatureModelDataDBC;
