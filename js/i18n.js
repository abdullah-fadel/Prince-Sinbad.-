"use strict";
/* =========================================================
   i18n.js — bilingual (Arabic/English) text dictionary.
   Loaded first (before config.js) so `t`/`LT` are available to
   every later script. Only *defines* things here — the first
   real call to applyLang() happens at the end of game.js, once
   refreshSoundBtns()/showBest() exist (see that file).
   ========================================================= */

let lang = localStorage.getItem('db_lang') || 'ar';

const STR = {
  ar: {
    'menu.title': 'سيف الصحراء',
    'menu.subtitle': 'مغامرة عربية — سنباد ينقذ الأميرة من زعيم اللصوص',
    'menu.story': 'هجم زعيم اللصوص على بغداد واختطف الأميرة إلى قلعته البعيدة!\nانطلق يا سنباد عبر الواحات والكهوف والأسواق… لوّح بسيفك، أطلق كرات النار، وتدحرج لتتفادى الضربات حتى تحرّرها.',
    'menu.start': 'ابدأ المغامرة',
    'menu.continue': 'متابعة',
    'menu.settings': '⚙ الإعدادات',
    'menu.hint': 'الحاسبة: الأسهم أو A/D للحركة • مسافة/W للقفز (مزدوجة) • J أو X للسيف • K أو Z لكرة النار • Shift أو C للدحرجة • S/▼ للنزول\nالموبايل: عصا التحكم على اليمين للحركة • السيف ⚔ وكرة النار 🔥 بجانبها • اقفز ⬆ يسارًا وتحته زر 💨▼ للدحرجة والنزول',
    'pause.title': 'إيقاف مؤقت',
    'pause.resume': 'استمرار',
    'pause.quit': 'القائمة الرئيسية',
    'over.title': 'انتهت اللعبة',
    'over.retry': 'حاول مرة ثانية',
    'lvl.complete': '🏆 اكتملت المرحلة!',
    'lvl.next': 'المرحلة التالية',
    'win.title': '👑 النصر!',
    'win.subtitle': 'هزمت زعيم اللصوص وأنقذت الأميرة… عاد السلام إلى المملكة',
    'win.again': 'العب من جديد',
    'rotate.text': 'أدر هاتفك للوضع الأفقي للعب',
    'pauseBtn.aria': 'إيقاف مؤقت',
    'settings.title': 'الإعدادات',
    'settings.language': 'اللغة',
    'settings.customize': 'تخصيص أزرار التحكم',
    'settings.close': 'رجوع',
    'controls.title': 'تخصيص أزرار التحكم',
    'controls.hint': 'اسحب أي زر أو منطقة العصا لتغيير مكانها، واستخدم الشريط لتكبيرها أو تصغيرها.',
    'controls.reset': 'إعادة الضبط الافتراضي',
    'controls.done': 'تم',
    'sound.on': '🔊 الصوت: يعمل',
    'sound.off': '🔇 الصوت: مغلق',
    'best.score': '🏅 أفضل نتيجة: {v}',
    'stats.coins': '💰 العملات: {v}',
    'stats.score': '⭐ النقاط: {v}',
    'stats.time': '⏱ الوقت: {v} ثانية',
    'stats.livesLeft': '❤ الأرواح المتبقية: {v}',
    'boss.chiefName': 'زعيم اللصوص',
    'boss.chiefTagline': 'المعركة الأخيرة… أنقذ الأميرة!',
    'hud.princessFreed': '✨ تحررت الأميرة! ✨',
    'checkpoint.saved': 'نقطة حفظ ✓',
    'warn.defeatFirst': 'اهزم {name} أولاً!',
    'bomb.detonate': 'فجّر الجدار 💣',
    'bomb.getBomb': 'احصل على قنبلة 🎬',
    'boss.bombReward': 'قنبلة إضافية! +1 💣',
    'elite.default': 'الحارس'
  },
  en: {
    'menu.title': 'Desert Blade',
    'menu.subtitle': 'An Arabian Adventure — Sinbad rescues the princess from the Bandit Chief',
    'menu.story': 'The Bandit Chief has attacked Baghdad and taken the princess to his distant fortress!\nSet out, Sinbad, across oases, caves and bazaars… swing your sword, hurl fireballs, and roll to dodge blows until she is free.',
    'menu.start': 'Start Adventure',
    'menu.continue': 'Continue',
    'menu.settings': '⚙ Settings',
    'menu.hint': 'Keyboard: Arrows or A/D to move • Space/W to jump (double jump) • J or X to sword • K or Z to fireball • Shift or C to roll • S/▼ to drop down\nMobile: joystick on the right to move • sword ⚔ and fireball 🔥 beside it • jump ⬆ on the left with the roll/drop button 💨▼ below it',
    'pause.title': 'Paused',
    'pause.resume': 'Resume',
    'pause.quit': 'Main Menu',
    'over.title': 'Game Over',
    'over.retry': 'Try Again',
    'lvl.complete': '🏆 Level Complete!',
    'lvl.next': 'Next Level',
    'win.title': '👑 Victory!',
    'win.subtitle': 'You defeated the Bandit Chief and freed the princess… peace returns to the kingdom',
    'win.again': 'Play Again',
    'rotate.text': 'Rotate your phone to landscape to play',
    'pauseBtn.aria': 'Pause',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.customize': 'Customize Controls',
    'settings.close': 'Back',
    'controls.title': 'Customize Controls',
    'controls.hint': 'Drag any button or the joystick zone to move it, and use the slider to resize it.',
    'controls.reset': 'Reset to Default',
    'controls.done': 'Done',
    'sound.on': '🔊 Sound: On',
    'sound.off': '🔇 Sound: Off',
    'best.score': '🏅 Best score: {v}',
    'stats.coins': '💰 Coins: {v}',
    'stats.score': '⭐ Score: {v}',
    'stats.time': '⏱ Time: {v}s',
    'stats.livesLeft': '❤ Lives left: {v}',
    'boss.chiefName': 'Bandit Chief',
    'boss.chiefTagline': 'The final battle… save the princess!',
    'hud.princessFreed': '✨ The princess is free! ✨',
    'checkpoint.saved': 'Checkpoint ✓',
    'warn.defeatFirst': 'Defeat {name} first!',
    'bomb.detonate': 'Blow up wall 💣',
    'bomb.getBomb': 'Get a bomb 🎬',
    'boss.bombReward': 'Bonus bomb! +1 💣',
    'elite.default': 'the Guardian'
  }
};

/* t(key, vars) — plain string lookup with {placeholder} substitution */
function t(key, vars){
  let s = (STR[lang] && STR[lang][key]) || STR.ar[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
/* LT(v) — resolves a bilingual {ar,en} content field (level names/stories/elite names) */
function LT(v){ return (v && typeof v === 'object') ? (v[lang] ?? v.ar) : v; }

/* applies every [data-i18n]/[data-i18n-html]/[data-i18n-aria] element + page dir/lang.
   \n in dictionary strings becomes <br> only for the -html variant. */
function applyLang(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml).split('\n').join('<br>'); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
function setLang(l){
  lang = l; localStorage.setItem('db_lang', l);
  applyLang();
  if (typeof refreshSoundBtns === 'function') refreshSoundBtns();
  if (typeof showBest === 'function') showBest();
  if (typeof refreshMenuButtons === 'function') refreshMenuButtons();
  if (typeof refreshLangBtns === 'function') refreshLangBtns();
}
