**You:**

PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\\ModelsTree\\World\\AZEROTH\\BOOTYBAY\\PASSIVEDOODAD\\SharkModels\\SharkModel01.m2'; const b=fs.readFileSync(f); const n=b.readUInt32LE(0x50), o=b.readUInt32LE(0x54); console.log('M2 textures:',n,'offset:', '0x'+o.toString(16)); for(let i=0;i<n;i++){const x=o+i*16; const type=b.readUInt32LE(x); const flags=b.readUInt32LE(x+4); const len=b.readUInt32LE(x+8); const off=b.readUInt32LE(x+12); const name=b.toString('utf8',off,off+len).replace(/\\0+$/,''); console.log({i,recordOffset:'0x'+x.toString(16),type,flags,len,nameOffset:'0x'+off.toString(16),name});}"
M2 textures: 4 offset: 0x4760
{
  i: 0,
  recordOffset: '0x4760',
  type: 0,
  flags: 3,
  len: 73,
  nameOffset: '0x47a0',
  name: 'World\\Generic\\Goblin\\PassiveDoodads\\GoblinMachinery\\DeadMineHangNets.blp\x00'
}
{
  i: 1,
  recordOffset: '0x4770',
  type: 0,
  flags: 3,
  len: 58,
  nameOffset: '0x47f0',
  name: 'World\\Generic\\Undead\\Passive Doodads\\Bell\\AnchorMetal.blp\x00'
}
{
  i: 2,
  recordOffset: '0x4780',
  type: 0,
  flags: 0,
  len: 63,
  nameOffset: '0x4830',
  name: 'world\\Azeroth\\BootyBay\\PassiveDoodad\\SharkModels\\SharkSkin.blp\x00'
}
{
  i: 3,
  recordOffset: '0x4790',
  type: 0,
  flags: 0,
  len: 69,
  nameOffset: '0x4870',
  name: 'world\\Azeroth\\BootyBay\\PassiveDoodad\\SharkModels\\SahauginReflect.blp\x00'
}
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\\ModelsTree\\World\\AZEROTH\\BOOTYBAY\\PASSIVEDOODAD\\SharkModels\\SharkModel0100.skin'; const b=fs.readFileSync(f); const h={indicesCount:b.readUInt32LE(4),indicesOffset:b.readUInt32LE(8),trianglesCount:b.readUInt32LE(12),trianglesOffset:b.readUInt32LE(16),propertiesCount:b.readUInt32LE(20),propertiesOffset:b.readUInt32LE(24),submeshesCount:b.readUInt32LE(28),submeshesOffset:b.readUInt32LE(32),batchesCount:b.readUInt32LE(36),batchesOffset:b.readUInt32LE(40),bonesCount:b.readUInt32LE(44)}; console.log(h); for(let i=0;i<h.batchesCount;i++){const o=h.batchesOffset+i*24; console.log({i,offset:'0x'+o.toString(16),flags:b.readUInt8(o),priorityPlane:b.readInt8(o+1),shader:b.readUInt16LE(o+2),skinSectionIndex:b.readUInt16LE(o+4),geosetIndex:b.readUInt16LE(o+6),colorIndex:b.readUInt16LE(o+8),materialIndex:b.readUInt16LE(o+10),materialLayer:b.readUInt16LE(o+12),textureCount:b.readUInt16LE(o+14),textureComboIndex:b.readUInt16LE(o+16),textureCoordIndex:b.readUInt16LE(o+18),textureWeightIndex:b.readUInt16LE(o+20),textureTransformIndex:b.readUInt16LE(o+22)});}"
{
  indicesCount: 368,
  indicesOffset: 48,
  trianglesCount: 1350,
  trianglesOffset: 784,
  propertiesCount: 368,
  propertiesOffset: 3488,
  submeshesCount: 4,
  submeshesOffset: 4960,
  batchesCount: 5,
  batchesOffset: 5152,
  bonesCount: 21
}
{
  i: 0,
  offset: '0x1420',
  flags: 16,
  priorityPlane: 0,
  shader: 0,
  skinSectionIndex: 0,
  geosetIndex: 0,
  colorIndex: 65535,
  materialIndex: 0,
  materialLayer: 0,
  textureCount: 1,
  textureComboIndex: 0,
  textureCoordIndex: 0,
  textureWeightIndex: 0,
  textureTransformIndex: 0
}
{
  i: 1,
  offset: '0x1438',
  flags: 16,
  priorityPlane: 0,
  shader: 0,
  skinSectionIndex: 1,
  geosetIndex: 1,
  colorIndex: 65535,
  materialIndex: 1,
  materialLayer: 0,
  textureCount: 1,
  textureComboIndex: 1,
  textureCoordIndex: 0,
  textureWeightIndex: 0,
  textureTransformIndex: 0
}
{
  i: 2,
  offset: '0x1450',
  flags: 16,
  priorityPlane: 0,
  shader: 0,
  skinSectionIndex: 2,
  geosetIndex: 2,
  colorIndex: 65535,
  materialIndex: 2,
  materialLayer: 0,
  textureCount: 1,
  textureComboIndex: 2,
  textureCoordIndex: 0,
  textureWeightIndex: 0,
  textureTransformIndex: 0
}
{
  i: 3,
  offset: '0x1468',
  flags: 16,
  priorityPlane: 0,
  shader: 0,
  skinSectionIndex: 2,
  geosetIndex: 2,
  colorIndex: 65535,
  materialIndex: 3,
  materialLayer: 1,
  textureCount: 1,
  textureComboIndex: 3,
  textureCoordIndex: 1,
  textureWeightIndex: 0,
  textureTransformIndex: 0
}
{
  i: 4,
  offset: '0x1480',
  flags: 16,
  priorityPlane: 0,
  shader: 0,
  skinSectionIndex: 3,
  geosetIndex: 3,
  colorIndex: 65535,
  materialIndex: 4,
  materialLayer: 0,
  textureCount: 1,
  textureComboIndex: 2,
  textureCoordIndex: 0,
  textureWeightIndex: 0,
  textureTransformIndex: 0
}
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG>
حالا با این اطلاعات بگو که اعداد 12200 و 12193 و 1557 در کجا هستند یا از کجا خوانده می شوند

* * *

**ChatGPT:**

با اطلاعاتی که الان از `SharkModel01.m2` و `SharkModel0100.skin` داریم، **این سه عدد (`12200`, `12193`, `1557`) داخل این دو فایل به‌عنوان ID مدل/تکسچر دیده نمی‌شوند**.

نکته مهم این است که این سه عدد احتمالاً از **DBC و زنجیره‌ی DisplayID → CreatureDisplayInfoExtra → مدل/تکسچر** می‌آیند، نه از ساختار مستقیم `.m2` یا `.skin`.

### چیزی که الان قطعی می‌دانیم

در `SharkModel01.m2`:

```
M2 textures: 4
```

و چهار texture reference داریم:

```
0 → DeadMineHangNets.blp
1 → AnchorMetal.blp
2 → SharkSkin.blp
3 → SahauginReflect.blp
```

در `SharkModel0100.skin` هم فقط mapping مربوط به geometry/material داریم:

```
batch 0 → textureComboIndex 0
batch 1 → textureComboIndex 1
batch 2 → textureComboIndex 2
batch 3 → textureComboIndex 3
batch 4 → textureComboIndex 2
```

بنابراین مسیر فعلی تقریباً این است:

```
Creature / NPC
      │
      ▼
CreatureDisplayInfo.dbc
      │
      │  model/display information
      ▼
CreatureDisplayInfoExtra.dbc
      │
      │  IDs / extra appearance data
      ▼
M2
      │
      ├── texture 0
      ├── texture 1
      ├── texture 2
      └── texture 3
```

### اما سؤال اصلی: 12200، 12193 و 1557 دقیقاً کجا هستند؟

از بررسی قبلی که روی `CreatureDisplayInfoExtra.dbc` انجام دادیم، این سه عدد را به‌عنوان **IDهایی که باید دنبال شوند** داشتیم:

```
1557
12193
12200
```

ولی باید بین دو حالت تفکیک کنیم:

1. **خود این اعداد در رکورد DBC ذخیره شده‌اند**
2. یا یکی از این اعداد از یک رکورد DBC خوانده می‌شود و سپس به فایل دیگری مثل M2/texture منتهی می‌شود.

برای اینکه دقیقاً مشخص کنیم هر سه عدد **در چه offset/fieldای قرار دارند**، بهترین کار این است که خود `CreatureDisplayInfoExtra.dbc` را byte-level جستجو کنیم و محل دقیقشان را پیدا کنیم.

در PowerShell پروژه، این دستور را اجرا کن:

```PowerShell
node -e "const fs=require('fs'); const f='.\ModelsTree\dbc\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id, 'hits:', hits.length, hits);}"
```

این خیلی مهم است، چون نتیجه چیزی شبیه این به ما می‌دهد:

```
1557 hits: ...
12193 hits: ...
12200 hits: ...
```

بعد از آن باید **offset هر occurrence را نسبت به ساختار DBC تبدیل کنیم به:**

```
record number
field number
field meaning
```

یعنی مثلاً اگر فرضاً خروجی بدهد:

```
12200 → 0x1234
```

ما محاسبه می‌کنیم:

```
header = 20 bytes
recordSize = ...
record = ...
field = ...
```

و مشخص می‌کنیم:

> `12200` در رکورد X، فیلد Y از `CreatureDisplayInfoExtra.dbc` است.

### یک نکته خیلی مهم

در M2 که فرستادی، مثلاً:

```
textureComboIndex: 2
```

**این `2` به معنی texture ID = 2 نیست.**

بلکه index داخل texture-combo data است و نهایتاً به یکی از چهار texture موجود در M2 می‌رسد.

همین‌طور:

```
materialIndex: 2
```

یا:

```
geosetIndex: 2
```

هیچ‌کدام به معنی `12200` یا `12193` نیستند.

پس فعلاً نباید دنبال تبدیل مستقیم:

```
12200 → SharkSkin.blp
```

در `.m2` بگردیم.

**اول باید محل دقیق این سه عدد در DBC را پیدا کنیم.**

دستور بالا را اجرا کن و خروجی کاملش را بفرست. بعد دقیقاً از روی offset می‌رویم داخل رکورد DBC و مشخص می‌کنیم **هر ID از کجا خوانده می‌شود و بعد چگونه به `SharkModel01.m2` می‌رسد.**

* * *

**You:**

PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\ModelsTree\dbc\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id, 'hits:', hits.length, hits);}"
node:fs:622
  return binding.open(
                 ^

Error: ENOENT: no such file or directory, open 'C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\.ModelsTreedbcCreatureDisplayInfoExtra.dbc'
    at Object.openSync (node:fs:622:18)
    at Object.readFileSync (node:fs:488:35)
    at [eval]:1:93
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12
    at [eval]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:449:60)
    at evalFunction (node:internal/process/execution:283:30)
    at evalTypeScript (node:internal/process/execution:295:3)
    at node:internal/main/eval_string:71:3 {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'C:\\Users\\ehsra\\Documents\\GitHub\\WMVxTOPNG\\.ModelsTreedbcCreatureDisplayInfoExtra.dbc'
}

Node.js v24.19.0
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG>

* * *

**ChatGPT:**

بله، مشکل از **escaping در PowerShell** است، نه از فایل.

در دستور قبلی `.\ModelsTree\...` داخل رشتهٔ double-quoted باعث شده `\`ها به شکل درست به Node نرسند و مسیر به این تبدیل شده:

```
.ModelsTreedbcCreatureDisplayInfoExtra.dbc
```

از آنجا که الان در ریشهٔ پروژه هستی، این دستور را **دقیقاً همین‌طور** اجرا کن:

```PowerShell
node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id,'hits:',hits.length,hits);}"
```

یا حتی مطمئن‌تر، چون PowerShell با مسیرها دردسر ایجاد کرده، از `$PWD` استفاده کنیم:

```PowerShell
node -e "const fs=require('fs'); const path=require('path'); const f=path.join(process.cwd(),'ModelsTree','dbc','CreatureDisplayInfoExtra.dbc'); console.log('FILE:',f); const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id,'hits:',hits.length,hits);}"
```

**دستور دوم را پیشنهاد می‌کنم.**

خروجی مورد انتظار چیزی شبیه این است:

```
FILE: C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\dbc\CreatureDisplayInfoExtra.dbc
1557 hits: ...
12193 hits: ...
12200 hits: ...
```

### بعد از این چه کار می‌کنیم؟

اگر مثلاً نتیجه بدهد:

```
1557 hits: 1 [ '0x....' ]
12193 hits: 1 [ '0x....' ]
12200 hits: 1 [ '0x....' ]
```

دیگر حدس نمی‌زنیم. از همان offsetها می‌توانیم دقیقاً محاسبه کنیم:

```
DBC header
   ↓
record size
   ↓
record number
   ↓
field number
   ↓
معنی field
   ↓
رابطه با CreatureDisplayInfo
   ↓
M2
   ↓
Skin
   ↓
Texture
```

و مشخص کنیم **12200، 12193 و 1557 دقیقاً چه هستند و چه نقشی در رسیدن به SharkModel01 دارند.**

دستور دوم را اجرا کن و **کل خروجی را بفرست**.

* * *

**You:**

PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id,'hits:',hits.length,hits);}"
1557 hits: 1 [ '0x1a9fc' ]
12193 hits: 4 [ '0x304fc', '0x4c878', '0x4c8cc', '0xa39dc' ]
12200 hits: 1 [ '0xa3c28' ]
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const path=require('path'); const f=path.join(process.cwd(),'ModelsTree','dbc','CreatureDisplayInfoExtra.dbc'); console.log('FILE:',f); const b=fs.readFileSync(f); const ids=[1557,12193,12200]; for(const id of ids){const hits=[]; for(let o=0;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id) hits.push('0x'+o.toString(16));} console.log(id,'hits:',hits.length,hits);}"
FILE: C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\dbc\CreatureDisplayInfoExtra.dbc
1557 hits: 1 [ '0x1a9fc' ]
12193 hits: 4 [ '0x304fc', '0x4c878', '0x4c8cc', '0xa39dc' ]
12200 hits: 1 [ '0xa3c28' ]
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG>

* * *

**ChatGPT:**

عالی. حالا دیگر اطلاعات کافی داریم که **محل واقعی این اعداد را در `CreatureDisplayInfoExtra.dbc` پیدا کنیم**.

نتیجه‌ای که گرفتیم:

```
1557  → 0x1A9FC
12193 → 0x304FC
12193 → 0x4C878
12193 → 0x4C8CC
12193 → 0xA39DC
12200 → 0xA3C28
```

اما یک نکته بسیار مهم وجود دارد:

**صرفاً پیدا کردن عدد در فایل DBC کافی نیست.** باید بفهمیم هر offset مربوط به کدام **record و field** است.

### قدم بعدی

این دستور را اجرا کن تا header واقعی DBC و اندازه رکورد را ببینیم:

```PowerShell
node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); console.log('size:',b.length); console.log('magic:',b.toString('ascii',0,4)); console.log('records:',b.readUInt32LE(4)); console.log('fields:',b.readUInt32LE(8)); console.log('recordSize:',b.readUInt32LE(12)); console.log('stringSize:',b.readUInt32LE(16));"
```

ولی برای اینکه **همین الان** بتوانیم offsetها را به رکورد تبدیل کنیم، این دستور کامل‌تر را هم اجرا کن:

```PowerShell
node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const records=b.readUInt32LE(4), fields=b.readUInt32LE(8), recordSize=b.readUInt32LE(12), stringSize=b.readUInt32LE(16), header=20; console.log({records,fields,recordSize,stringSize,header}); const ids=[1557,12193,12200]; for(const id of ids){console.log('\\nID',id); for(let o=header;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id){const rel=o-header; const record=Math.floor(rel/recordSize); const within=rel%recordSize; const field=Math.floor(within/4); console.log({offset:'0x'+o.toString(16),record,field,within:'0x'+within.toString(16)});}}}"
```

### چرا این مرحله مهم است؟

ساختار DBC معمولاً به شکل زیر است:

```
0x00  Magic
0x04  Record count
0x08  Field count
0x0C  Record size
0x10  String block size
      ↓
0x14  Record #0
      ↓
      Record #1
      ↓
      Record #2
      ...
```

پس اگر مثلاً:

```
recordSize = 20
```

باشد، می‌توانیم یک offset مثل:

```
0x1A9FC
```

را به شکل دقیق تبدیل کنیم:

```
0x1A9FC
   ↓
record #...
   ↓
field #...
```

و بعد می‌توانیم بفهمیم:

```
1557
  ↓
CreatureDisplayInfoExtra.dbc
  ↓
Record X
  ↓
Field Y
```

و همین کار را برای:

```
12193
12200
```

انجام می‌دهیم.

**بعد از این مرحله، قدم بعدی مهم‌تر است:** مشخص می‌کنیم آیا این field واقعاً `ID` مربوط به یک چیز خاص است یا صرفاً یک مقدار عددی تصادفی/رنگ/texture variation/geometry و غیره.

خروجی دستور دوم را بفرست؛ از آنجا می‌توانیم دقیقاً رکوردهای مربوط به این سه عدد را باز کنیم.

* * *

**You:**

PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); console.log('size:',b.length); console.log('magic:',b.toString('ascii',0,4)); console.log('records:',b.readUInt32LE(4)); console.log('fields:',b.readUInt32LE(8)); console.log('recordSize:',b.readUInt32LE(12)); console.log('stringSize:',b.readUInt32LE(16));"
size: 1825335
magic: WDBC
records: 15475
fields: 21
recordSize: 84
stringSize: 525415
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG> node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfoExtra.dbc'; const b=fs.readFileSync(f); const records=b.readUInt32LE(4), fields=b.readUInt32LE(8), recordSize=b.readUInt32LE(12), stringSize=b.readUInt32LE(16), header=20; console.log({records,fields,recordSize,stringSize,header}); const ids=[1557,12193,12200]; for(const id of ids){console.log('\\nID',id); for(let o=header;o<=b.length-4;o+=4){if(b.readUInt32LE(o)===id){const rel=o-header; const record=Math.floor(rel/recordSize); const within=rel%recordSize; const field=Math.floor(within/4); console.log({offset:'0x'+o.toString(16),record,field,within:'0x'+within.toString(16)});}}}"

{
  records: 15475,
  fields: 21,
  recordSize: 84,
  stringSize: 525415,
  header: 20
}
\nID 1557
{ offset: '0x1a9fc', record: 1298, field: 0, within: '0x0' }
\nID 12193
{ offset: '0x304fc', record: 2355, field: 11, within: '0x2c' }
{ offset: '0x4c878', record: 3731, field: 10, within: '0x28' }
{ offset: '0x4c8cc', record: 3732, field: 10, within: '0x28' }
{ offset: '0xa39dc', record: 7978, field: 0, within: '0x0' }
\nID 12200
{ offset: '0xa3c28', record: 7985, field: 0, within: '0x0' }
PS C:\Users\ehsra\Documents\GitHub\WMVxTOPNG>

* * *

**ChatGPT:**

دقیقاً؛ این خروجی یک نکته خیلی مهم را روشن کرد.

فایل شما:

```
records     = 15475
fields      = 21
recordSize  = 84
```

یعنی هر رکورد دقیقاً:

```
21 × 4 = 84 bytes
```

و بنابراین محاسبه‌ای که انجام دادیم معتبر است.

طبق ساختار `CreatureDisplayInfoExtra.dbc`، فیلدهای 0 تا 20 شامل ID، اطلاعات race/sex/appearance، یازده `NPCItemDisplay`، flags و در انتها `BakeName` هستند. [TrinityCore MMo Project Wiki+1](https://trinitycore.info/files/DBC/335/creaturedisplayinfoextra?utm_source=chatgpt.com)

### نتیجه مهم درباره سه عدد

| عدد | Offset | Record | Field | معنی |
| --- | --- | --- | --- | --- |
| **1557** | `0x1A9FC` | **1298** | **0** | **ID رکورد** |
| **12193** | `0xA39DC` | **7978** | **0** | **ID رکورد** |
| **12200** | `0xA3C28` | **7985** | **0** | **ID رکورد** |
| 12193 | `0x304FC` | 2355 | 11 | NPCItemDisplay |
| 12193 | `0x4C878` | 3731 | 10 | NPCItemDisplay |
| 12193 | `0x4C8CC` | 3732 | 10 | NPCItemDisplay |

بنابراین **سه موردی که ما دنبالش هستیم، به‌صورت اصلی در DBC اینجا هستند:**

```
1557  → CreatureDisplayInfoExtra record ID
12193 → CreatureDisplayInfoExtra record ID
12200 → CreatureDisplayInfoExtra record ID
```

یعنی:

```
CreatureDisplayInfoExtra.dbc

record 1298
field 0 = 1557

record 7978
field 0 = 12193

record 7985
field 0 = 12200
```

اما آن چهار occurrence دیگر `12193`، **ID رکورد نیستند**؛ آنها صرفاً مقداری برابر 12193 در فیلدهای `NPCItemDisplay` هستند.

---

## اما یک نکته بسیار مهم‌تر

این سه ID هنوز **مستقیماً به `SharkModel01.m2` وصل نشده‌اند**.

زنجیره صحیح برای Creature این است:

```
CreatureDisplayInfo.dbc
        │
        │ field 3
        ▼
CreatureDisplayInfoExtra.dbc
        │
        │ ID = 1557 / 12193 / 12200
        ▼
Extra appearance / equipment
```

در `CreatureDisplayInfo.dbc`، فیلد 3 همان `ExtendedDisplayInfoID` است که به `CreatureDisplayInfoExtra.dbc` اشاره می‌کند. در همان جدول، فیلد 1 نیز `ModelID` است که به `CreatureModelData.dbc` می‌رود. [TrinityCore MMo Project Wiki+1](https://trinitycore.info/en/files/DBC/335/creaturedisplayinfo?utm_source=chatgpt.com)

پس برای پیدا کردن اینکه **این سه ID برای چه مدل‌هایی استفاده می‌شوند**، الان باید برعکس حرکت کنیم:

```
1557
12193
12200
   ▲
   │
CreatureDisplayInfo.dbc
field 3
   │
   ├── ModelID
   │
   ▼
CreatureModelData.dbc
   │
   ▼
M2
```

### قدم بعدی دقیق

حالا باید در `CreatureDisplayInfo.dbc` دنبال همین سه مقدار بگردیم.

این دستور را اجرا کن:

```PowerShell
node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfo.dbc'; const b=fs.readFileSync(f); console.log('size:',b.length); console.log('magic:',b.toString('ascii',0,4)); console.log('records:',b.readUInt32LE(4)); console.log('fields:',b.readUInt32LE(8)); console.log('recordSize:',b.readUInt32LE(12)); console.log('stringSize:',b.readUInt32LE(16));"
```

و بعد:

```PowerShell
node -e "const fs=require('fs'); const f='.\\ModelsTree\\dbc\\CreatureDisplayInfo.dbc'; const b=fs.readFileSync(f); const records=b.readUInt32LE(4), fields=b.readUInt32LE(8), recordSize=b.readUInt32LE(12), header=20; const ids=[1557,12193,12200]; console.log({records,fields,recordSize,header}); for(const id of ids){console.log('\\nExtendedDisplayInfoID',id); for(let r=0;r<records;r++){const o=header+r*recordSize; if(b.readUInt32LE(o+12)===id){console.log({record:r,offset:'0x'+o.toString(16),ID:b.readUInt32LE(o),ModelID:b.readUInt32LE(o+4),SoundID:b.readUInt32LE(o+8),ExtendedDisplayInfoID:b.readUInt32LE(o+12)});}}}"
```

این دستور عمداً فقط:

```
field 3 = ExtendedDisplayInfoID
```

را بررسی می‌کند.

اگر مثلاً خروجی چیزی مثل:

```
ExtendedDisplayInfoID 1557
{
  record: ...,
  ID: ...,
  ModelID: ...,
  SoundID: ...,
  ExtendedDisplayInfoID: 1557
}
```

بدهد، آن‌وقت **ModelID واقعی که باید ما را به M2 برساند** داریم.

و این دقیقاً همان چیزی است که برای پروژه `WMVxTOPNG` لازم داریم؛ چون در نهایت هدف ما این است که مسیر واقعی را از DBC تا فایل M2 و سپس texture دنبال کنیم، نه اینکه صرفاً عددهای تصادفی داخل فایل‌ها را پیدا کنیم. [CorePunch](https://corepunch.github.io/open-realm/games/world-of-warcraft/dbc-reference/?utm_source=chatgpt.com)

**پس فعلاً نتیجه قطعی:**

```
1557  = ID رکورد CreatureDisplayInfoExtra
12193 = ID رکورد CreatureDisplayInfoExtra
12200 = ID رکورد CreatureDisplayInfoExtra
```

و قدم بعدی، پیدا کردن **CreatureDisplayInfoهایی است که به این سه Extra ID اشاره می‌کنند**.