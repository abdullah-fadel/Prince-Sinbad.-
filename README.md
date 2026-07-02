# سيف الصحراء — Desert Blade

لعبة منصّات ثنائية الأبعاد بطابع عربي أصيل، واجهتها بالعربية (RTL). كل الرسومات مرسومة
برمجياً على الـ Canvas (بدون صور خارجية)، وكل الأصوات مولّدة حيّاً بـ Web Audio API مع
موسيقى خلفية توليدية على مقام الحجاز. مصمَّمة أولاً للهواتف الذكية بالوضع الأفقي
(تحكم باللمس، ملء الشاشة، دقة عالية، 60 إطاراً بالثانية) وتعمل كاملةً على الحاسوب أيضاً.

An original 2D Arabian-fantasy platformer (Arabic UI, RTL). Everything is drawn
procedurally on canvas — no sprites — and every sound is synthesized live with the
Web Audio API. Built primarily for smartphones in landscape, fully playable on desktop.

## اللعب / Play

يعمل مباشرة بفتح `index.html`، أو عبر خادم محلي:

```
python3 -m http.server 8080
```

ثم افتح `http://localhost:8080`. لا توجد خطوة بناء إطلاقاً.

عند تفعيل GitHub Pages (يتم تلقائياً عبر الـ workflow المرفق عند الدفع إلى `main`)
تصبح اللعبة متاحة على رابط المستودع في Pages.

- **الحاسوب:** الأسهم أو `A`/`D` للحركة، مسافة/`W`/`↑` للقفز (قفزة مزدوجة)، `X`/`Z` لرمي النار،
  `S`/`↓` للنزول أو الهبوط عبر المنصات، `Esc` للإيقاف المؤقت.
- **الموبايل:** أزرار لمس على الشاشة — الوضع الأفقي فقط.

## الأنظمة / Systems

Coyote time, jump buffering, variable jump height, double jump, shaped gravity
(floaty apex / snappy fall), squash & stretch, hit-stop, camera with dead zone,
look-ahead, shake and dynamic boss-fight zoom, soft shadows, parallax sunset
background, pooled particles, telegraphed enemy/boss attacks, checkpoints,
secrets, and a chained-princess rescue finale.

## البنية / Structure

- `index.html` — هيكل الصفحة + قوائم البداية/الإيقاف/النتائج
- `css/style.css` — القوائم وأزرار اللمس وشاشة "أدر هاتفك"
- `js/` — سكربتات تُحمَّل بالترتيب (بدون أدوات بناء):
  `config` (الكانفس/الدقة/المعايرة) → `audio` (مؤثرات + موسيقى) → `input` → `levels` (خرائط ASCII)
  → `core` (الحالة + التصادم) → `particles` → `camera` → `player` → `enemies` → `boss`
  → `render` (الخلفية/البلاطات) → `actors` (الشخصيات) → `hud` → `game` (الحلقة + الحالات)
