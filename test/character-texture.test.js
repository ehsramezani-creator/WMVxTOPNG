import test from 'node:test';
import assert from 'node:assert/strict';
import { CharSectionsDBC } from '../src/loaders/CharSectionsDBC.js';
import { raceGenderFromModel } from '../src/loaders/CharacterTextureResolver.js';

function makeDBC() {
  const texture = 'Character/BloodElf/Female/Skin.blp';
  const strings = Buffer.from(`\0${texture}\0`, 'utf8');
  const header = Buffer.alloc(20); header.write('WDBC', 0, 4, 'ascii'); header.writeUInt32LE(1, 4); header.writeUInt32LE(10, 8); header.writeUInt32LE(40, 12); header.writeUInt32LE(strings.length, 16);
  const body = Buffer.alloc(40); body.writeUInt32LE(1, 0); body.writeUInt32LE(10, 4); body.writeUInt32LE(1, 8); body.writeUInt32LE(0, 12); body.writeUInt32LE(1, 16); body.writeUInt32LE(0, 20); body.writeUInt32LE(0, 24); body.writeUInt32LE(0, 28); body.writeUInt32LE(0, 32); body.writeUInt32LE(0, 36);
  return Buffer.concat([header, body, strings]);
}

test('parses WotLK CharSections schema', () => { const dbc = new CharSectionsDBC().parse(makeDBC()); assert.equal(dbc.records[0].raceId, 10); assert.equal(dbc.records[0].textures[0], 'Character/BloodElf/Female/Skin.blp'); });
test('detects legacy character identity', () => { assert.deepEqual(raceGenderFromModel('ModelsTree/Character/BloodElf/Female/BloodElfFemale.M2'), { raceId: 10, sexId: 1, raceName: 'bloodelf', genderName: 'female' }); });
