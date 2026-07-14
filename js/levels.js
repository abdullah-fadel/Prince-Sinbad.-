"use strict";
/* =========================================================
   levels.js — ASCII tile maps.
   Legend:
    # solid stone   = one-way platform   ^ spikes   L ladder
    C coin  H heart  P fire pack  T chest  K checkpoint  D exit door
    S scorpion  B bandit  V wolf  Y knife-throwing highwayman
    E elite guard (must be defeated to exit)
    M moving platform  F falling platform
    * lantern  p palm  W water  G boss  R princess
    X destructible wall (blocks like '#' until bombed — see clearBombWall)
   Rows are padded to the widest row on load, so trailing
   spaces are not significant. Each level also carries a short
   `story` line (shown on the intro banner) and a `biome` tag
   ('desert'|'forest'|'mountain'|'babylon'|'oasis'|'sandyCaves',
   default desert) that recolors the sky/skyline/ground and every
   enemy's palette, so the journey reads as moving through distinct
   places. A level with an `E` elite guard won't let the player
   through its exit door until that guard (named by `eliteName`) is
   defeated — likewise a level whose `G` boss is still alive
   (`bossKind:'warlord'` for the mid-roster boss, default 'chief' for
   the final boss) blocks the door until it's defeated.
   `name`/`story`/`eliteName`/`bossName`/`bossTagline` are bilingual
   {ar,en} objects — resolve with LT() at read time, never cache a
   resolved string, so a language switch mid-level updates instantly.
   NOTE: level order is append-only past this point — a save system
   persists `db_save.lvl` as a plain index, so existing indices must
   never be reordered again once shipped.
   ========================================================= */

const LEVELS = [
{ name:{ar:'قرية الحرس الملكي',en:'Royal Guard Village'},
  story:{ar:'ليلةَ سقوط القصر… يتتبّع الأمير عبدالله أثر خاطفي الأميرة نوفه عبر القرية المحترقة.',
         en:"The night the palace fell — Prince Abdullah tracks Princess Nofa's captors through the burning village."}, rows:[
"                                                                                                              ",
"                                          CCC                                                    CCC         ",
"    H            CC                      =====               C C C                              =====        ",
"   ===          ====        *                       T                          H                        C    ",
"                                   ====            ===         M         =====                 P      ===   ",
"    C   p             C C                                                                 *                  ",
"       ###          =====      p          S            ==== ^^ ====        B        p          S        D   ",
"  K    ###                    ###   B    ####     K                       #####     ###    K   ####    #### ",
"###### ####  C C  ##########  ###  ###########    ##                  ## ######### ####  ################## ",
"###### ##################  ###  ###########    ##      W W       ## ########## ####  ###################",
"############^^^^^############################    ####WWWWWWWWWW######################^^^^###################",
"##############################################WWW############################################################"
]},
{ name:{ar:'سراديب القصر المنسي',en:'Cellars of the Forgotten Palace'},
  story:{ar:'ينزل عبدالله إلى سراديب قصرٍ منسي — مياهٌ جوفيةٌ وأشواكٌ وسلالمُ في الظلام.',
         en:'Abdullah descends into a forgotten palace cellar — groundwater, spikes and ladders in the dark.'}, rows:[
"                                                                                                              ",
"          CCC                  C C C                 CCC                       C C                            ",
"         =====        *       ======        F F F   =====         *          =====          T       *        ",
"                 L                                                                                  ===       ",
"    P            L        B              M                    S        L               B                 D   ",
"   ===   S       L       ####      =============              ####     L    ^^^^      #####     S      #### ",
"  K      ####    L                                    K                L   ######  K            ####         ",
"######  ######################   ##          ##   #######   ####################  ########  ################ ",
"######  ###################### * ##   CCC    ## * #######   ####################  ########^^################ ",
"######^^######################   ##  #####   ##   #######^^^####################  ################W##########",
"##############################WWW##^^#####^^^##WWW###########################################################",
"##############################################################################################################"
]},
{ name:{ar:'درب القوافل',en:'The Caravan Road'},
  story:{ar:'يلاحق عبدالله آثار الخاطفين على طريق التجار القديم — والقُطّاع يعترضون دربه.',
         en:"Abdullah follows the captors' trail down the old traders' road — and highwaymen bar his way."}, rows:[
"                                                                                                              ",
"                                          CCC                                                    CCC         ",
"    H            CC                      =====               C C C                              =====        ",
"   ===          ====        *                       T                          H                        C    ",
"                                   ====            ===         M         =====                 P      ===   ",
"    C   p        P    C C                                                                 *                  ",
"       ###          =====      p          B            ==== ^^ ====        B        p          B        D   ",
"  K    ###                    ###   B    ####     K                       #####     ###    K   ####    #### ",
"###### ####  C C  ##########  ###  ###########    ##                  ## ######### ####  ################## ",
"###### ##################  ###  ###########    ##      W W       ## ########## ####  ###################",
"############^^^^^############################    ####WWWWWWWWWW######################^^^^###################",
"##############################################WWW############################################################"
]},
{ name:{ar:'أسواق الكرخ',en:'The Karkh Bazaars'},
  story:{ar:'يبحث عبدالله في أسواق الكرخ عن خبرٍ لمخبأ العصابة — واحذر عقارب الأزقّة!',
         en:"Abdullah hunts the Karkh bazaars for word of the gang's hideout — beware the alley scorpions!"}, rows:[
"                                                                                                              ",
"          CCC                  C C C                 CCC                       C C                            ",
"         =====        *       ======        F F F   =====         *          =====          T       *        ",
"                 L                                                                                  ===       ",
"    P    H       L        S              M                    S        L               S                 D   ",
"   ===   S       L       ####      =============              ####     L    ^^^^      #####     S      #### ",
"  K      ####    L                                    K                L   ######  K            ####         ",
"######  ######################   ##          ##   #######   ####################  ########  ################ ",
"######  ###################### * ##   CCC    ## * #######   ####################  ########^^################ ",
"######^^######################   ##  #####   ##   #######^^^####################  ################W##########",
"##############################WWW##^^#####^^^##WWW###########################################################",
"##############################################################################################################"
]},
{ name:{ar:'عين الصفراء',en:'Safra Spring'},
  story:{ar:'واحةٌ نائيةٌ عند عين الصفراء — جدارٌ مفخّخٌ يحرس نفقاً سرياً سلكه الخاطفون.',
         en:'A remote oasis at Safra Spring — a trapped wall hides the secret tunnel the captors used.'},
  biome:'oasis', rows:[
"                                                                                                              ",
"                                          CCC                                                    CCC         ",
"    H            CC                      =====               C C C                              =====        ",
"   ===          ====        *                       T                          H                        C    ",
"                                   ====            ===         M         =====                 P      ===   ",
"    C   p             C C                                                                 *                  ",
"       ###          =====      p          Y            ==== ^^ ====        B        p          Y        D   ",
"  K    ###                    ###   B    ####     K                       #####     ###    K   ####    #### ",
"###### ####  C C  ##########  ###  ###X#######    ##                  ## ######### ####  ################## ",
"###### ##################  ###  ######H####    ##      W W       ## ########## ####  ###################",
"############^^^^^############################    ####WWWWWWWWWW######################^^^^###################",
"##############################################WWW############################################################"
]},
{ name:{ar:'مغارة الرمال الحمراء',en:'The Red Sand Cavern'},
  story:{ar:'في مغارة الرمال الحمراء يواجه عبدالله «أمير الحرب» — أوّل قادة العصابة.',
         en:"In the Red Sand Cavern, Abdullah faces the Warlord — the first of the gang's captains."},
  biome:'sandyCaves', bossKind:'warlord',
  bossName:{ar:'أمير الحرب',en:'The Warlord'},
  bossTagline:{ar:'لن تعبر كهوفي حياً!',en:'You shall not pass my caves alive!'}, rows:[
"                                            ",
"                                            ",
"        *           C C C         *         ",
"   C C                        C C           ",
"  =====                              =====  ",
"                                            ",
"                                            ",
"   K                              G     D   ",
"                                            ",
"############################################",
"############################################",
"############################################"
]},
{ name:{ar:'غابة الأرز الشمالية',en:'The Northern Cedar Forest'},
  story:{ar:'يدخل عبدالله غابة الأرز الشمالية — ذئابٌ بين الأشجار وحارسٌ نخبةٌ يقطع الدرب!',
         en:'Abdullah enters the northern cedar forest — wolves among the trees and an elite guardian block the path!'},
  biome:'forest', eliteName:{ar:'حارس الغابة',en:'Forest Guardian'}, rows:[
"                                                                                                              ",
"                                          CCC                                                    CCC         ",
"    H            CC                      =====               C C C                              =====        ",
"   ===          ====        *                       T                          H                        C    ",
"                                   ====            ===         M         =====                 P      ===   ",
"    C   p             C C                                                                 *                  ",
"       ###          =====      p          V            ==== ^^ ====        B        p          E        D   ",
"  K    ###                    ###   B    ####     K                       #####     ###    K   ####    #### ",
"###### ####  C C  ##########  ###  ###########    ##                  ## ######### ####  ################## ",
"###### ##################  ###  ###########    ##      W W       ## ########## ####  ###################",
"############^^^^^############################    ####WWWWWWWWWW######################^^^^###################",
"##############################################WWW############################################################"
]},
{ name:{ar:'ممرات الجبال الشمالية',en:'The Northern Mountain Passes'},
  story:{ar:'يتسلّق عبدالله ممرات كردستان الوعرة — آخرُ حارسٍ نخبةٍ قبل الحصن!',
         en:'Abdullah climbs the rugged Kurdistan passes — the last elite guardian before the fortress!'},
  biome:'mountain', eliteName:{ar:'حارس الجبل',en:'Mountain Guardian'}, rows:[
"                                                                                                              ",
"          CCC                  C C C                 CCC                       C C                            ",
"         =====        *       ======        F F F   =====         *          =====          T       *        ",
"                 L                                                                                  ===       ",
"    P            L        B              M                    S        L               E                 D   ",
"   ===   S       L       ####      =============              ####     L    ^^^^      #####     V      #### ",
"  K      ####    L                                    K                L   ######  K            ####         ",
"######  ######################   ##          ##   #######   ####################  ########  ################ ",
"######  ###################### * ##   CCC    ## * #######   ####################  ########^^################ ",
"######^^######################   ##  #####   ##   #######^^^####################  ################W##########",
"##############################WWW##^^#####^^^##WWW###########################################################",
"##############################################################################################################"
]},
{ name:{ar:'أطلال بابل',en:'The Ruins of Babylon'},
  story:{ar:'حارسٌ نخبةٌ يحمي بوابة بابل القديمة التي تفتح الطريق شمالاً نحو الجبال.',
         en:'An elite guardian holds the ancient gate of Babylon that opens the road north to the mountains.'},
  biome:'babylon', eliteName:{ar:'حارس بابل',en:'Guardian of Babylon'}, rows:[
"                                                                                                              ",
"                                          CCC                                                    CCC         ",
"    H            CC                      =====               C C C                              =====        ",
"   ===          ====        *                       T                          H                        C    ",
"                                   ====            ===         M         =====                 P      ===   ",
"    C   p             C C                                                                 *                  ",
"       ###          =====      p          S            ==== ^^ ====        B        p          E        D   ",
"  K    ###                    ###   B    ####     K                       #####     ###    K   ####    #### ",
"###### ####  C C  ##########  ###  ###########    ##                  ## ######### ####  ################## ",
"###### ##################  ###  ###########    ##      W W       ## ########## ####  ###################",
"############^^^^^############################    ####WWWWWWWWWW######################^^^^###################",
"##############################################WWW############################################################"
]},
{ name:{ar:'قاعة العرش المظلمة',en:'The Dark Throne Room'},
  story:{ar:'المواجهة الأخيرة! حرّر الأميرة نوفه — بدّل بين السيف وكرات النار، وتدحرج لتنجو.',
         en:'The final confrontation! Free Princess Nofa — switch between sword and fireballs, and roll to survive.'},
  boss:true, rows:[
"                              ",
"                              ",
"        *            *       ",
"   C C                  C C  ",
"  =====                ===== ",
"                              ",
"                          R   ",
"   K            G       ==== ",
"                              ",
"##############################",
"##############################",
"##############################"
]},
/* ===== NEW LEVELS (appended — indices 10..15) =====================
   Kept append-only so old save indices stay valid. Each uses a fully
   solid 4-row floor (rows 8..11) so traversal from the K checkpoint to
   the D exit is always unbroken; theme/difficulty come from the biome
   recolor and enemy mix, per the epic's chapter design. ============= */
{ name:{ar:'قوارب الأهوار',en:'The Marsh Boats'},
  story:{ar:'يقود الأثر عبدالله جنوباً إلى الأهوار — الخاطفون يهربون بالقوارب بين القصب.',
         en:'The trail leads Abdullah south to the marshes — the captors flee by boat through the reeds.'},
  biome:'oasis', rows:[
"                                                              ",
"              CCC                        CCC                  ",
"             =====          M           =====                 ",
"        *              T                          *           ",
"                  ====                ====                    ",
"     p       C C                   C C          p             ",
"                                                              ",
"   K    Y        B          M          Y         B       D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]},
{ name:{ar:'جزيرة الطيور المهاجرة',en:'Isle of the Migratory Birds'},
  story:{ar:'جزيرةٌ صغيرةٌ وسط الأهوار حيث يكمن قُطّاع الطرق بين أعشاش الطيور.',
         en:'A small isle amid the marshes where highwaymen lie in ambush among the birds.'},
  biome:'oasis', rows:[
"                                                              ",
"          CCC              CCC              CCC               ",
"         =====            =====            =====              ",
"     *          H                    T           *           ",
"              ====                 ====                       ",
"    p      C C          p        C C           p             ",
"                                                              ",
"   K     B       B        S          B        B         D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]},
{ name:{ar:'مضيف الشيخ الغريب',en:"The Strange Sheikh's Guesthouse"},
  story:{ar:'في مضيف شيخٍ غامضٍ يجد عبدالله دليلاً يعرف طريق السراديب القديمة.',
         en:"At a mysterious sheikh's guesthouse, Abdullah finds a guide who knows the old cellar road."},
  rows:[
"                                                              ",
"               CCC                    CCC                     ",
"              =====                  =====                    ",
"      *        H          T                     *            ",
"                    ====        ====                          ",
"     p      C C                        C C     p             ",
"                                                              ",
"   K      S            S          B              H       D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]},
{ name:{ar:'سفوح الثلج الأولى',en:'The First Snowy Foothills'},
  story:{ar:'أوّل برد الشمال — ثلوجٌ خفيفةٌ وذئابٌ جائعةٌ على سفوح الجبال.',
         en:'The first cold of the north — light snow and hungry wolves on the mountain foothills.'},
  biome:'mountain', rows:[
"                                                              ",
"           CCC          F   F   F         CCC                ",
"          =====                          =====               ",
"      *         L                    T          *            ",
"               L        ====        ====                     ",
"    p     C C  L                  C C          p             ",
"              L                                              ",
"   K     V        S          V          V        S      D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]},
{ name:{ar:'أسوار الحصن الخارجية',en:'The Outer Fortress Walls'},
  story:{ar:'أسوار حصن الوريث الأخير — حراسٌ مضاعفون وفخاخٌ على كل شرفة.',
         en:"The walls of the last heir's fortress — doubled guards and traps on every rampart."},
  biome:'sandyCaves', rows:[
"                                                              ",
"          CCC       CCC       CCC       CCC                  ",
"         =====     =====     =====     =====                 ",
"     *        H                              *               ",
"                ====    ^^     ====                          ",
"    p     C C                          C C    p              ",
"                                                             ",
"   K   Y     B      Y      B      B     Y          D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]},
{ name:{ar:'الفناء الداخلي',en:'The Inner Courtyard'},
  story:{ar:'الفناء الداخلي — لأوّل مرةٍ يواجه عبدالله حرّاس النخبة مجتمعين.',
         en:'The inner courtyard — for the first time Abdullah faces the elite guards together.'},
  biome:'babylon', eliteName:{ar:'حارس الفناء',en:'Courtyard Guardian'}, rows:[
"                                                              ",
"              CCC                        CCC                 ",
"             =====                      =====                ",
"        *              T                          *          ",
"                  ====                ====                    ",
"     p       C C                   C C          p            ",
"                                                             ",
"   K      B        E              B         E          D    ",
"##############################################################",
"##############################################################",
"##############################################################",
"##############################################################"
]}
];

/* =========================================================
   WORLD — the epic's map → chapter → level structure. Level
   entries are INDICES into LEVELS above (never the level objects),
   so the physical LEVELS array stays append-only and every old
   save index keeps pointing at the same physical level (see the
   save-migration note in game.js). Chapters with an empty `levels`
   array are future-map data scaffolding only: they contribute
   nothing to PLAY_ORDER and are never reachable yet (rule 5).
   ========================================================= */
const WORLD = [
  { id:'iraq', name:{ar:'العراق — أرض البداية',en:'Iraq — Land of Beginnings'},
    chapters:[
      { name:{ar:'جنوب الرافدين',en:'Southern Mesopotamia'}, levels:[0,2,3,4] },
      { name:{ar:'الأهوار الجنوبية',en:'The Southern Marshes'}, levels:[10,11,12] },
      { name:{ar:'سراديب القصر وأطلال بابل',en:'Palace Cellars & Babylon'}, levels:[1,5,8] },
      { name:{ar:'دروب كردستان الشمالية',en:'Northern Kurdistan Trails'}, levels:[6,7,13] },
      { name:{ar:'حصن الوريث الأخير',en:"The Last Heir's Fortress"}, levels:[14,15] },
      { name:{ar:'قاعة العرش',en:'The Throne Room'}, levels:[9] }
    ]
  },
  /* ---- future maps: data scaffold only, no playable levels yet ---- */
  { id:'levant', future:true, name:{ar:'بلاد الشام — جبال وثلوج',en:'The Levant — Mountains & Snow'},
    chapters:[
      { name:{ar:'أسواق دمشق العتيقة',en:'Old Damascus Bazaars'}, levels:[] },
      { name:{ar:'غابات الأرز اللبنانية',en:'Lebanese Cedar Forests'}, levels:[] },
      { name:{ar:'قمم الثلج الشمالية',en:'Northern Snow Peaks'}, levels:[] }
    ]
  },
  { id:'gulf', future:true, name:{ar:'سواحل الخليج — البحر والموانئ',en:'The Gulf Coast — Sea & Ports'},
    chapters:[
      { name:{ar:'ميناء اللؤلؤ',en:'The Pearl Harbor'}, levels:[] },
      { name:{ar:'جزر الصيادين المهجورة',en:'Abandoned Fishermen Isles'}, levels:[] },
      { name:{ar:'أعماق الشعاب المرجانية',en:'The Coral Deeps'}, levels:[] }
    ]
  },
  { id:'islands', future:true, name:{ar:'جزر الأمير الأسطورية — أدغال وغموض',en:"The Prince's Legendary Isles — Jungle & Mystery"},
    chapters:[
      { name:{ar:'الغابة الاستوائية',en:'The Tropical Jungle'}, levels:[] },
      { name:{ar:'معبد الطائر الرُخ',en:'Temple of the Roc'}, levels:[] },
      { name:{ar:'كهوف اللؤلؤ المسحورة',en:'The Enchanted Pearl Caves'}, levels:[] }
    ]
  },
  { id:'persia', future:true, name:{ar:'جبال فارس المتجمدة — الشتاء القاسي',en:'Frozen Persian Mountains — The Hard Winter'},
    chapters:[
      { name:{ar:'قرى الجبال المتجمدة',en:'Frozen Mountain Villages'}, levels:[] },
      { name:{ar:'ممرات الانهيار الجليدي',en:'Avalanche Passes'}, levels:[] },
      { name:{ar:'قلعة الملك الشتوي',en:'Castle of the Winter King'}, levels:[] }
    ]
  },
  { id:'volcano', future:true, name:{ar:'أرض النار — البركان الأسطوري',en:'Land of Fire — The Legendary Volcano'},
    chapters:[
      { name:{ar:'سفوح البركان المتشققة',en:'Cracked Volcano Slopes'}, levels:[] },
      { name:{ar:'مناجم الحديد المحترقة',en:'The Burning Iron Mines'}, levels:[] },
      { name:{ar:'عرش أمير الظلام',en:'Throne of the Dark Prince'}, levels:[] }
    ]
  }
];

/* Flattened play order + per-level chapter/map metadata, derived from
   WORLD. PLAY_ORDER[p] = the LEVELS index played at sequence position p;
   LEVEL_META[lvlIndex] = { map, chapter } bilingual names for the HUD. */
const PLAY_ORDER = [];
const LEVEL_META = {};
for (const m of WORLD) for (const ch of m.chapters) for (const li of ch.levels){
  PLAY_ORDER.push(li);
  LEVEL_META[li] = { map:m.name, chapter:ch.name };
}
function playPos(lvlIndex){ return PLAY_ORDER.indexOf(lvlIndex); }
function nextLevelIndex(lvlIndex){
  const p = playPos(lvlIndex);
  return (p >= 0 && p + 1 < PLAY_ORDER.length) ? PLAY_ORDER[p + 1] : -1;
}
