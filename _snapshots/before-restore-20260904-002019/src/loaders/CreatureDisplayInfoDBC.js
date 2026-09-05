import fs from 'node:fs/promises';

const HEADER_SIZE = 20;
const RECORD_SIZE = 64;

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

export class CreatureDisplayInfoDBC {
  constructor(records = []) {
    this.records = records;
  }

  static async load(filePath) {
    return new CreatureDisplayInfoDBC().load(filePath);
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

    if (fieldCount !== 16 || recordSize !== RECORD_SIZE) {
      throw new Error(
        `Unsupported CreatureDisplayInfo.dbc schema: fields=${fieldCount}, recordSize=${recordSize}`
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
        modelId: buffer.readUInt32LE(o + 4),
        soundId: buffer.readUInt32LE(o + 8),
        extendedDisplayInfoId: buffer.readUInt32LE(o + 12),
        scale: buffer.readFloatLE(o + 16),
        alpha: buffer.readUInt32LE(o + 20),

        textures: [
          readCString(
            buffer,
            stringsOffset,
            stringBlockSize,
            buffer.readUInt32LE(o + 24)
          ),
          readCString(
            buffer,
            stringsOffset,
            stringBlockSize,
            buffer.readUInt32LE(o + 28)
          ),
          readCString(
            buffer,
            stringsOffset,
            stringBlockSize,
            buffer.readUInt32LE(o + 32)
          ),
        ],

        portraitTextureName: readCString(
          buffer,
          stringsOffset,
          stringBlockSize,
          buffer.readUInt32LE(o + 36)
        ),

        sizeClass: buffer.readUInt32LE(o + 40),
        bloodId: buffer.readUInt32LE(o + 44),
        npcSoundId: buffer.readUInt32LE(o + 48),
        particleColorId: buffer.readUInt32LE(o + 52),
        creatureGeosetData: buffer.readUInt32LE(o + 56),
        objectEffectPackageId: buffer.readUInt32LE(o + 60),
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

  findByModelId(modelId) {
    return this.records.filter(record => record.modelId === modelId);
  }
}

export default CreatureDisplayInfoDBC;
