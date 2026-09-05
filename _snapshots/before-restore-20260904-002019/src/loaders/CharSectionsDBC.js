import fs from 'node:fs/promises';

const HEADER_SIZE = 20;
const RECORD_SIZE = 40;

function range(buffer, offset, size, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > buffer.length) {
    throw new RangeError(`${label} exceeds DBC file`);
  }
}

function readCString(buffer, stringBlockOffset, stringBlockSize, offset) {
  if (!offset || offset >= stringBlockSize) return '';
  const start = stringBlockOffset + offset;
  const end = buffer.indexOf(0, start, stringBlockOffset + stringBlockSize);
  return buffer.toString('utf8', start, end < 0 ? stringBlockOffset + stringBlockSize : end);
}

export class CharSectionsDBC {
  constructor(records = []) { this.records = records; }

  static async load(filePath) { return new CharSectionsDBC().load(filePath); }

  async load(filePath) { return this.parse(await fs.readFile(filePath), filePath); }

  parse(buffer, source = '<buffer>') {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    range(buffer, 0, HEADER_SIZE, 'DBC header');
    if (buffer.toString('ascii', 0, 4) !== 'WDBC') throw new Error(`Invalid DBC magic: ${source}`);

    const recordCount = buffer.readUInt32LE(4);
    const fieldCount = buffer.readUInt32LE(8);
    const recordSize = buffer.readUInt32LE(12);
    const stringBlockSize = buffer.readUInt32LE(16);
    if (fieldCount !== 10 || recordSize !== RECORD_SIZE) {
      throw new Error(`Unsupported CharSections.dbc schema: fields=${fieldCount}, recordSize=${recordSize}`);
    }

    const recordsOffset = HEADER_SIZE;
    const stringsOffset = recordsOffset + recordCount * recordSize;
    range(buffer, recordsOffset, recordCount * recordSize + stringBlockSize, 'DBC records/string block');

    this.records = new Array(recordCount);
    for (let i = 0; i < recordCount; i++) {
      const o = recordsOffset + i * recordSize;
      this.records[i] = {
        id: buffer.readUInt32LE(o),
        raceId: buffer.readUInt32LE(o + 4),
        sexId: buffer.readUInt32LE(o + 8),
        baseSection: buffer.readUInt32LE(o + 12),
        textures: [
          readCString(buffer, stringsOffset, stringBlockSize, buffer.readUInt32LE(o + 16)),
          readCString(buffer, stringsOffset, stringBlockSize, buffer.readUInt32LE(o + 20)),
          readCString(buffer, stringsOffset, stringBlockSize, buffer.readUInt32LE(o + 24)),
        ],
        flags: buffer.readUInt32LE(o + 28),
        variationIndex: buffer.readUInt32LE(o + 32),
        colorIndex: buffer.readUInt32LE(o + 36),
      };
    }
    this.source = source;
    return this;
  }

  matching({ raceId, sexId, baseSection } = {}) {
    return this.records.filter(r =>
      (raceId == null || r.raceId === raceId) &&
      (sexId == null || r.sexId === sexId) &&
      (baseSection == null || r.baseSection === baseSection)
    );
  }

  find({ raceId, sexId, baseSection, variationIndex, colorIndex } = {}) {
    return this.records.find(r =>
      (raceId == null || r.raceId === raceId) &&
      (sexId == null || r.sexId === sexId) &&
      (baseSection == null || r.baseSection === baseSection) &&
      (variationIndex == null || r.variationIndex === variationIndex) &&
      (colorIndex == null || r.colorIndex === colorIndex)
    ) ?? null;
  }
}

export default CharSectionsDBC;
