/* ============================================================
   VVK SHOP — общий i18n-движок.
   Использование в конкретной витрине:
     const i18n = new VVKi18n({ dictPath: 'data/i18n/', langs: ['ru','en','zh','hi'], default: 'ru' });
     await i18n.init();
     i18n.onChange(lang => { ...перерендерить каталог/корзину... });
   Разметка: <span data-i18n="hero_title"></span>
   Для строк с плейсхолдерами вида {temp} — использовать i18n.t('key', {temp: -18})
   ============================================================ */
class VVKi18n {
  constructor(opts){
    this.dictPath = opts.dictPath || 'data/i18n/';
    this.langs = opts.langs || ['ru','en'];
    this.lang = opts.default || 'ru';
    this.dicts = {};
    this._listeners = [];
  }

  async init(){
    await Promise.all(this.langs.map(async l => {
      try{
        const res = await fetch(`${this.dictPath}${l}.json`);
        this.dicts[l] = await res.json();
      }catch(e){
        console.error('[i18n] не удалось загрузить словарь', l, e);
        this.dicts[l] = {};
      }
    }));
    const saved = localStorage.getItem('vvk_lang');
    if (saved && this.langs.includes(saved)) this.lang = saved;
    this.apply();
  }

  t(key, vars){
    let str = (this.dicts[this.lang] && this.dicts[this.lang][key]) || key;
    if (vars) Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
    return str;
  }

  setLang(lang){
    if (!this.langs.includes(lang)) return;
    this.lang = lang;
    localStorage.setItem('vvk_lang', lang);
    this.apply();
    this._listeners.forEach(fn => fn(lang));
  }

  onChange(fn){ this._listeners.push(fn); }

  apply(){
    document.documentElement.setAttribute('lang', this.lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-lang-btn]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-lang-btn') === this.lang);
    });
  }
}
