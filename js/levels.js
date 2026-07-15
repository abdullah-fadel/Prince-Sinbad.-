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
/* ===== LEVELS 10..21 (generated: longer + harder — jumpable death-pits
   (<=3 tiles), floating platforms, spikes, denser rosters). Names/stories
   preserved; only the maps were rebuilt. ============================= */
{ name:{ar:'قوارب الأهوار',en:'The Marsh Boats'},
  story:{ar:'يقود الأثر عبدالله جنوباً إلى الأهوار — الخاطفون يهربون بالقوارب بين القصب.',en:'The trail leads Abdullah south to the marshes — the captors flee by boat through the reeds.'},
  biome:'oasis', rows:[
"",
"",
"",
"                                                              C C C",
"                                        C C C                 ======                       C C C",
"                             *          =====                             *      C C C     ======",
"                                                                         H       ======",
"  K                  Y            CC        B        C KC   B      Y                   K    CB    C                D",
"###############  #########  #^^######   #######################################^^#######################################",
"###############  #########  #########   ################################################################################",
"###############  #########  #########   ################################################################################",
"###############  #########  #########   ################################################################################"
]},
{ name:{ar:'جزيرة الطيور المهاجرة',en:'Isle of the Migratory Birds'},
  story:{ar:'جزيرةٌ صغيرةٌ وسط الأهوار حيث يكمن قُطّاع الطرق بين أعشاش الطيور.',en:'A small isle amid the marshes where highwaymen lie in ambush among the birds.'},
  biome:'oasis', rows:[
"",
"",
"",
"                                                    C C C",
"                      C C C                         ======     C C",
"              C C     ======   *             *                 ====                 *        C C C",
"              ====                                                                           ======",
"  K                   B    C           C           SC     S C  K        S    S         K           S        C      D",
"###############   ###########  ####^^####  ###################################################^^########################",
"###############   ###########  ##########  #############################################################################",
"###############   ###########  ##########  #############################################################################",
"###############   ###########  ##########  #############################################################################"
]},
{ name:{ar:'مضيف الشيخ الغريب',en:"The Strange Sheikh's Guesthouse"},
  story:{ar:'في مضيف شيخٍ غامضٍ يجد عبدالله دليلاً يعرف طريق السراديب القديمة.',en:"At a mysterious sheikh's guesthouse, Abdullah finds a guide who knows the old cellar road."},
  rows:[
"",
"",
"",
"                                  C C C",
"                            C C   ======                         C C C",
"                            ====                             C C =====                  C C       *     *",
"                                                      H      ====                       ====",
"  K                                 B CCC S      S         K        S        S C              K C         C        D",
"###############   #######  ##############################################^^#############################################",
"###############   #######  #############################################################################################",
"###############   #######  #############################################################################################",
"###############   #######  #############################################################################################"
]},
{ name:{ar:'سفوح الثلج الأولى',en:'The First Snowy Foothills'},
  story:{ar:'أوّل برد الشمال — ثلوجٌ خفيفةٌ وذئابٌ جائعةٌ على سفوح الجبال.',en:'The first cold of the north — light snow and hungry wolves on the mountain foothills.'},
  biome:'mountain', rows:[
"",
"",
"",
"",
"                                          C C C",
"                               * C C C    =====                                C C C       *                    *",
"                                 ======                                        =====",
"  K                  V                 C    C  V              K     V           S     S    C K       S    CC       D",
"###############   #########   ######   ###########  #######^^###########^^##############################################",
"###############   #########   ######   ###########  ####################################################################",
"###############   #########   ######   ###########  ####################################################################",
"###############   #########   ######   ###########  ####################################################################"
]},
{ name:{ar:'أسوار الحصن الخارجية',en:'The Outer Fortress Walls'},
  story:{ar:'أسوار حصن الوريث الأخير — حراسٌ مضاعفون وفخاخٌ على كل شرفة.',en:"The walls of the last heir's fortress — doubled guards and traps on every rampart."},
  biome:'sandyCaves', rows:[
"",
"",
"",
"                                                                                    C C C",
"                                                                            C C     ======",
"                *                       C C C        * *                    ====     C C",
"                                        =====                                        ====",
"  K                             B C        B        K          B    B       Y  C   YC    C K           B           D",
"###############   ^^######^^   ######   ######   ######^^###############################################################",
"###############   ##########   ######   ######   #######################################################################",
"###############   ##########   ######   ######   #######################################################################",
"###############   ##########   ######   ######   #######################################################################"
]},
{ name:{ar:'الفناء الداخلي',en:'The Inner Courtyard'},
  story:{ar:'الفناء الداخلي — لأوّل مرةٍ يواجه عبدالله حرّاس النخبة مجتمعين.',en:'The inner courtyard — for the first time Abdullah faces the elite guards together.'},
  biome:'babylon', eliteName:{ar:'حارس الفناء',en:'Courtyard Guardian'}, rows:[
"",
"",
"",
"                                                    C C",
"                                                    ====              C C CC C C",
"                                 *   C C                             *==========                 C C",
"                                     ====                                                        ====",
"  K      C   C                            E          K          B          E    B       K   C  C C                 D",
"###############   ######  ###^^##  ################################################^^###################################",
"###############   ######  #######  #####################################################################################",
"###############   ######  #######  #####################################################################################",
"###############   ######  #######  #####################################################################################"
]},
{ name:{ar:'بوابة الأهرام',en:'Gate of the Pyramids'},
  story:{ar:'يعبر عبدالله البحر إلى مصر — عند بوابة الأهرام تنهض العقارب والأفاعي من الرمال.',en:'Abdullah crosses to Egypt — at the gate of the pyramids, scorpions and snakes rise from the sand.'},
  biome:'egypt', rows:[
"",
"",
"",
"                                                          C C C",
"              C C C                                       ======                                C C",
"              ===== *                  *       *         C C              C C C                 ====",
"                                                         ====             ======",
"  K                  S C         C      N       S            K            C     C N     K   C       S         C    D",
"###############   ########  ########  #####^^#########################^^################################################",
"###############   ########  ########  ##################################################################################",
"###############   ########  ########  ##################################################################################",
"###############   ########  ########  ##################################################################################"
]},
{ name:{ar:'وادي الأفاعي',en:'Valley of Serpents'},
  story:{ar:'وادٍ ضيّق تسكنه الأفاعي — تنساب سريعةً على الرمال، فاحذر لدغاتها.',en:'A narrow valley of serpents — they race low across the sand; beware their strike.'},
  biome:'egypt', rows:[
"",
"",
"",
"                                                      C C",
"               C C                                    ====",
"               ====          C C C                      *      *     *       C C",
"                             =====                                           ====",
"  K           C    S            SC        S     K       N        S           N    N      K       C                 D",
"###############   ####^^###  #########   ############^^##################^^#############################################",
"###############   #########  #########   ###############################################################################",
"###############   #########  #########   ###############################################################################",
"###############   #########  #########   ###############################################################################"
]},
{ name:{ar:'معبد الرمال',en:'Temple of Sands'},
  story:{ar:'داخل معبد الرمال تستيقظ أوّل مومياء — بطيئةٌ لكنها لا تتوقّف عن ملاحقتك.',en:'Inside the Temple of Sands the first mummy awakens — slow, but it never stops coming.'},
  biome:'egypt', rows:[
"",
"",
"",
"                                                       C C C",
"            C C     C C                                =====",
"            ====    ====                       C C C  *  * *                          C C C",
"                                               ======                        P        ======",
"  K                C   S         SC                U    K   C     S     N               CK        UC               D",
"###############  ###########   ##########   #########################^^#####################^^#^^#######################",
"###############  ###########   ##########   ############################################################################",
"###############  ###########   ##########   ############################################################################",
"###############  ###########   ##########   ############################################################################"
]},
{ name:{ar:'سرداب المومياوات',en:'Crypt of the Mummies'},
  story:{ar:'سردابٌ مظلمٌ تحرسه المومياوات — احذر ما يزحف في الظلام والتقط النار لتنجو.',en:'A dark crypt guarded by mummies — beware what crawls in the dark, and grab fire to survive.'},
  biome:'egypt', rows:[
"",
"",
"",
"                                                                                             C C C",
"                   C C                            C C C                                      =====",
"                   ====               C C C       =====   *          C C C              *",
"                                      ======                         ======                P",
"  K              CN                      U            N   C     K     N         N     K         U   C        C C   D",
"###############  ####^^#   #^^####^^#  #########  ######################################################################",
"###############  #######   ##########  #########  ######################################################################",
"###############  #######   ##########  #########  ######################################################################",
"###############  #######   ##########  #########  ######################################################################"
]},
{ name:{ar:'قاعة الفراعنة',en:'Hall of the Pharaohs'},
  story:{ar:'قاعة الفراعنة العظيمة — عقاربٌ وأفاعٍ ومومياواتٌ تحرس كنز الملوك.',en:"The great Hall of the Pharaohs — scorpions, snakes and mummies guard the kings' treasure."},
  biome:'egypt', rows:[
"",
"",
"",
"             C C C",
"             ======                       C C C",
"                 C C                      =====      *             C C            *                    *",
"                 ====                                              ====    H",
"  K        C      S         CS    N      S            K     C N       N         U    K    C   C   S  C             D",
"###############  ########  ###########  ########^^   ####^^#################################^^##########################",
"###############  ########  ###########  ##########   ###################################################################",
"###############  ########  ###########  ##########   ###################################################################",
"###############  ########  ###########  ##########   ###################################################################"
]},
{ name:{ar:'لعنة الملك',en:"The King's Curse"},
  story:{ar:'لعنة الملك القديم! جيشٌ من المومياوات يسدّ الطريق — بدّل بين السيف والنار ولا تتوقّف.',en:"The old king's curse! A wall of mummies bars the road — switch between sword and fire and never stop."},
  biome:'egypt', rows:[
"",
"",
"",
"                               C C C",
"                               ======                                        C C C                 C C C",
"            *                                                           C*C C======      * C C     ======",
"                              P                     H                   ======             ====",
"  K       C       U      N                     UC          K    U    C  U    N            KC     U    U            D",
"###############  ##########  ######   ##^^#########################################^^###################################",
"###############  ##########  ######   ##################################################################################",
"###############  ##########  ######   ##################################################################################",
"###############  ##########  ######   ##################################################################################"
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
  { id:'iraq', unlockKeys:0, name:{ar:'خريطة العراق',en:'Iraq Map'},
    /* chapters == "stages" (مراحل) in the UI. `unlockKeys` gates a stage on
       the running key total (1 key per level cleared); `future:true` marks a
       coming-soon stage with no levels yet. */
    chapters:[
      { name:{ar:'صحراء الأنبار',en:'Anbar Desert'}, unlockKeys:0,
        desc:{ar:'منطقة صحراوية واسعة مليئة بالتحديات — اجمع قواك وتجاوز العقبات لتصل للنصر.',
               en:'A vast desert region full of challenges — gather your strength and overcome every obstacle to reach victory.'},
        levels:[0,2,3,4,10,11,12,1,5,8] },
      { name:{ar:'بادية العراق',en:'The Iraqi Steppe'}, unlockKeys:10,
        desc:{ar:'سهوبٌ قاحلةٌ تقود أثر الخاطفين إلى قلب المعركة — تُفتح بجمع المفاتيح.',
               en:"Barren steppes where the captors' trail leads to the heart of battle — unlocked by collecting keys."},
        levels:[6,7,13,14,15,9] },
      { name:{ar:'أرض بابل',en:'The Land of Babylon'}, future:true, unlockKeys:99,
        desc:{ar:'أطلال بابل الأسطورية… فصلٌ قادمٌ من الملحمة.',
               en:'The legendary ruins of Babylon… a coming chapter of the epic.'},
        levels:[] }
    ]
  },
  /* ---- Egypt: a full new playable map, unlocked with keys earned in Iraq ---- */
  { id:'egypt', unlockKeys:6, name:{ar:'خريطة مصر',en:'Egypt Map'},
    chapters:[
      { name:{ar:'رمال مصر',en:'The Sands of Egypt'}, unlockKeys:6,
        desc:{ar:'من الأهرام إلى سراديب الفراعنة — عقاربٌ وأفاعٍ ومومياواتٌ تحرس اللعنة القديمة.',
               en:'From the pyramids to the pharaohs\' crypts — scorpions, snakes and mummies guard an ancient curse.'},
        levels:[16,17,18,19,20,21] }
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

/* Flattened play order + per-level metadata, derived from WORLD.
   PLAY_ORDER[p] = the LEVELS index played at sequence position p;
   LEVEL_META[lvlIndex] = { map, chapter } bilingual names for the HUD;
   STAGE_OF / MAP_OF map a level index to its owning stage / map object
   (used by the map screen's key-gating and level-select). */
const PLAY_ORDER = [];
const LEVEL_META = {};
const STAGE_OF = {};
const MAP_OF = {};
for (const m of WORLD) for (const ch of m.chapters) for (const li of ch.levels){
  PLAY_ORDER.push(li);
  LEVEL_META[li] = { map:m.name, chapter:ch.name };
  STAGE_OF[li] = ch; MAP_OF[li] = m;
}
function playPos(lvlIndex){ return PLAY_ORDER.indexOf(lvlIndex); }
function nextLevelIndex(lvlIndex){
  const p = playPos(lvlIndex);
  return (p >= 0 && p + 1 < PLAY_ORDER.length) ? PLAY_ORDER[p + 1] : -1;
}
/* stage-relative helpers for the map screen */
function stageIndexOf(lvlIndex){
  const st = STAGE_OF[lvlIndex];
  return st ? st.levels.indexOf(lvlIndex) : -1;   // 0-based position within its stage
}
