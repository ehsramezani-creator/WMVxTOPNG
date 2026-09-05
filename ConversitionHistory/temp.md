# GryphonPet — extracted conversation context

> Temporary working file. Source: `ConversitionHistory/WMVxTOPNG 07.md` and `ConversitionHistory/WMVxTOPNG 08.md` on branch `feature/wmvx-character-texturing`.

---

## WMVxTOPNG 07 — Test sequence / Test 05

### Conversation before

**You:**

چرا با حدس و سعی و خطا جلو میریم 
بهتره که تست های قبلی که سالم بودن را بررسی کنیم 
در گیت نمونه سالم داریم

**ChatGPT:**

دقیقاً. این روش خیلی بهتر است.

اگر در Git یک نمونه سالم و قبلاً تست‌شده داریم، نباید با حدس و خطا رفتار Loader/Renderer را تغییر بدهیم. باید اول مشخص کنیم نمونه سالم دقیقاً با چه فایل‌هایی، چه ساختاری و چه کدی کار کرده و بعد همان مسیر را برای مورد فعلی بازسازی کنیم.

---

### GryphonPet occurrence

**You:**

تست 04
Directory: `C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\Creature\ALLIANCERIDER`

تست 05
Directory: `C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\Creature\GryphonPet`

تست 06
Directory: `C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\Creature\FelGolem`

---

### Conversation after

**ChatGPT:**

تست‌های مرجع به ترتیب:

```text
01 Boxtest
02 FishingBox
03 Dam
04 AllianceRider
05 GryphonPet
06 FelGolem
07 SHARK
```

و دستور رندر Test 05:

```PowerShell
node .\src\tools\render-model.js "C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\Creature\GryphonPet" "C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\TestOutput\Reference-Test05-GryphonPet"
```

---

## WMVxTOPNG 07 — Successful GryphonPet render baseline

### Conversation before

**You:**

در این مرحله ما به این مشکل خوردیم و بهتره تست‌های قبلی سالم را بررسی کنیم.

**ChatGPT:**

باید از آخرین نمونه سالم Git شروع کنیم و همان مسیر را بازتولید کنیم؛ نه اینکه Renderer یا Loader را حدسی تغییر دهیم.

---

### GryphonPet occurrence

اجرای Test 05 در تاریخچه:

```text
Model       : GryphonPet
version     : 264
vertices    : 1120
triangles   : 1366
skin        : GryphonPet00.skin
textures    : 4
```

و نتیجه baseline ثبت شده بود:

```text
05 GryphonPet: 1/1 successful, 0 failed
```

همچنین در گزارش تست‌ها:

```text
05 GryphonPet: Normal render PASS
05 GryphonPet: Camera orbit PASS
Orbit views: 31
```

---

### Conversation after

**ChatGPT:**

GryphonPet یکی از تست‌های مرجع موفق است و باید برای توسعه مدل‌های Creature بعدی به‌عنوان baseline استفاده شود.

---

## WMVxTOPNG 07 — مسیر DBC و Skin ID

### Conversation before

**You:**

خب حالا برای:

`C:\Users\ehsra\Documents\GitHub\WMVxTOPNG\ModelsTree\Creature\GryphonPet\GryphonPet.M2`

تست کنیم که به چه عددی می‌رسیم.

**ChatGPT:**

در تست‌های موفق قبلی، GryphonPet به عدد `30412` رسیده بود؛ اما باید مسیر دقیق تولید این عدد را از کد و DBC دوباره تأیید کنیم.

---

### GryphonPet occurrence

ابتدا مشخص شد:

```text
CreatureModelData.dbc
records    = 1331
recordSize = 112
```

سپس رکورد مدل پیدا شد:

```text
record: 1251
ID: 3212
ModelName: Creature\\GryphonPet\\GryphonPet.mdx
offset: 140132
```

---

### Conversation after

مسیر بعدی:

```text
GryphonPet.m2
↓
CreatureModelData.dbc
↓
ID = 3212
↓
CreatureDisplayInfo.dbc
```

و نتیجه نهایی Resolver:

```json
{
  "isCreatureModel": true,
  "hasSkins": true,
  "modelData": {
    "id": 3212,
    "modelName": "Creature\\GryphonPet\\GryphonPet.mdx"
  },
  "displayInfos": [
    {
      "id": 30412,
      "modelId": 3212,
      "textureVariations": [
        "GryphonPet",
        "GryphonPet3",
        "GryphonPet2"
      ]
    }
  ]
}
```

بنابراین:

```text
GryphonPet.M2
   ↓
CreatureModelData.dbc
   ↓
ModelData.ID = 3212
   ↓
CreatureDisplayInfo.dbc
   ↓
DisplayInfo.ID = 30412
   ↓
WMVx Skins = 30412
```

---

## WMVxTOPNG 08 — جمع‌بندی مسیر GryphonPet

### Conversation before

**You:**

خب حالا به طور کامل مسیر را در چت‌های WMVxTOPNG 05، 06 و 07 چه مسیری را طی کردیم؟

**ChatGPT:**

در 05 تا 07 مسیر از parsing M2/SKIN به شناخت کامل pipeline و مقایسه با implementation سالم تغییر کرد.

در این مسیر مشخص شد که:

```text
M2
+
SKIN
+
BLP
+
DBC
↓
M2LegacyLoader
↓
SkinLegacyLoader
↓
MaterialResolver
↓
ModelAssembler
↓
SoftwareRenderer
↓
PNG
```

---

### GryphonPet occurrence

در تست‌های Creature:

```text
AllianceRider = 17202
GryphonPet    = 30412
FelGolem      = 22733

Shark:
1557
12193
12200
```

و برای GryphonPet مشخص شد:

```text
GryphonPet.M2
    ↓
CreatureModelData.dbc
    ↓
modelData.id = 3212
    ↓
CreatureDisplayInfo.dbc
    ↓
displayInfo.id = 30412
```

---

### Conversation after

نتیجه تست‌های قبلی:

```text
01 Boxtest       1/1 successful
02 FishingBox    1/1 successful
03 Dam           1/1 successful
04 AllianceRider 1/1 successful
05 GryphonPet    1/1 successful
06 FelGolem      1/1 successful
07 SHARK         2/2 successful
```

و Test 05 به‌عنوان یکی از baselineهای معتبر پروژه ثبت شد.

---

## WMVxTOPNG 08 — Render test history

### Conversation before

**You:**

حالا برای مدل GryphonPet تست کنیم که به چه عددی می‌رسیم.

**ChatGPT:**

نتیجه مورد انتظار و قبلاً تأییدشده `30412` است؛ مسیر DBC باید دوباره بررسی شود.

---

### GryphonPet occurrence

خروجی تست سالم:

```text
Model       : GryphonPet
Resolved    : true
Skin count  : 1
Skin IDs    : 30412
```

و خروجی Render/Orbit نیز در baseline ثبت شده:

```text
Test 05 — GryphonPet
Normal render: PASS
Camera orbit: PASS
Orbit views: 31
Creature Skin ID: 30412
```

---

### Conversation after

**ChatGPT:**

`GryphonPet → 30412` یک نمونه تأییدشده برای مسیر Creature Skin ID است و باید برای مقایسه با مدل‌های Creature بعدی استفاده شود.

---

## Key verified facts

```text
Model: GryphonPet.m2
CreatureModelData.ID: 3212
CreatureDisplayInfo.ID / WMVx Skins: 30412
Texture variations:
  0 → GryphonPet
  1 → GryphonPet3
  2 → GryphonPet2

Skin files:
  GryphonPet00.skin
  GryphonPet01.skin

Known-good historical test:
  Normal render: PASS
  Orbit: PASS
  Orbit views: 31
```
