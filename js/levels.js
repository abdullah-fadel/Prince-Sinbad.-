"use strict";
/* =========================================================
   levels.js — ASCII tile maps.
   Legend:
    # solid stone   = one-way platform   ^ spikes   L ladder
    C coin  H heart  P fire pack  T chest  K checkpoint  D exit door
    S scorpion  B bandit  V wolf  E elite guard (must be defeated to exit)
    M moving platform  F falling platform
    * lantern  p palm  W water  G boss  R princess
   Rows are padded to the widest row on load, so trailing
   spaces are not significant. Each level also carries a short
   `story` line (shown on the intro banner) and a `biome` tag
   ('desert'|'forest'|'mountain'|'babylon', default desert) that
   recolors the sky/skyline/ground and every enemy's palette, so
   the journey reads as moving through distinct places. A level
   with an `E` elite guard won't let the player through its exit
   door until that guard (named by `eliteName`) is defeated.
   `name`/`story`/`eliteName` are bilingual {ar,en} objects —
   resolve with LT() at read time, never cache a resolved string.
   ========================================================= */

const LEVELS = [
{ name:{ar:'واحة القرية',en:'Village Oasis'},
  story:{ar:'بدأت الرحلة! اعبر واحة القرية، تعلّم القفز والدحرجة وواجه أول اللصوص.',
         en:'The journey begins! Cross the village oasis, learn to jump and roll, and face your first bandits.'}, rows:[
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
{ name:{ar:'كهوف القصر',en:'Palace Caves'},
  story:{ar:'انزل إلى كهوف القصر المظلمة — احذر المياه والأشواك، وتسلّق السلالم.',
         en:'Descend into the dark palace caves — beware the water and spikes, and climb the ladders.'}, rows:[
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
{ name:{ar:'طريق القوافل الذهبية',en:'The Golden Caravan Road'},
  story:{ar:'لاحق أثر اللصوص على طريق القوافل — لوّح بسيفك بشجاعة أمام قُطّاع الطرق!',
         en:"Follow the bandits' trail down the caravan road — swing your sword bravely against the highwaymen!"}, rows:[
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
{ name:{ar:'سوق بغداد القديمة',en:'The Old Baghdad Bazaar'},
  story:{ar:'ابحث في سوق بغداد العتيق عن الطريق إلى القلعة — واحذر عقارب الأزقّة!',
         en:'Search the old Baghdad bazaar for the way to the castle — beware the alley scorpions!'}, rows:[
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
{ name:{ar:'غابة الأرز الكثيفة',en:'The Dense Cedar Forest'},
  story:{ar:'دخل سنباد غابة الأرز الكثيفة — الذئاب تتربص بين الأشجار، ولصوص الغابة يحرسون الممرات!',
         en:'Sinbad enters the dense cedar forest — wolves lurk among the trees, and forest bandits guard the passages!'},
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
{ name:{ar:'دروب الجبال الوعرة',en:'The Rugged Mountain Trails'},
  story:{ar:'تسلّق سنباد الجبال الوعرة — عقارب الجليد وذئاب الثلج ومحاربو المرتفعات يحرسون الطريق!',
         en:'Sinbad climbs the rugged mountain trails — ice scorpions, snow wolves, and highland warriors guard the way!'},
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
{ name:{ar:'أطلال بابل القديمة',en:'The Ancient Ruins of Babylon'},
  story:{ar:'وصل سنباد إلى أطلال بابل الغامضة — عقارب المعبد وحراسه الذهبيون يحمون أسرار المدينة المفقودة!',
         en:"Sinbad reaches the mysterious ruins of Babylon — temple scorpions and golden guards protect the lost city's secrets!"},
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
{ name:{ar:'قاعة العرش',en:'The Throne Room'},
  story:{ar:'المواجهة الأخيرة! حرّر الأميرة — بدّل بين السيف وكرات النار، وتدحرج لتنجو.',
         en:'The final confrontation! Free the princess — switch between sword and fireballs, and roll to survive.'},
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
]}
];
