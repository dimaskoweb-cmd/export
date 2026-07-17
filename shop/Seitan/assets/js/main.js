/* ============================================================
   VVK SHOP · Seitan — сборка витрины.
   Зависит от _shared/js/i18n-core.js и _shared/js/cart-core.js
   (подключены в index.html до этого файла).
   ============================================================ */
(async function(){

  // --- Внимание при локальном тестировании ---
  // fetch('data/products.json') не сработает при открытии файла
  // напрямую двойным кликом (file://) — браузер блокирует fetch
  // локальных файлов по CORS. Для проверки на своей машине нужно
  // поднять локальный сервер, например: python3 -m http.server
  // На GitHub Pages это ограничение не действует.

  const MANAGER_EMAIL = 'dimasko.web@gmail.com';
  const ASSET_VERSION = 'v=1784281717'; // бампаем при каждом деплое — иначе GitHub Pages/браузер может отдавать старые data-файлы из кэша

  // Настройки EmailJS — реальная автоматическая отправка (без CDN, SDK лежит локально в _shared/js/)
  const EMAILJS_SERVICE_ID = 'service_07prkee';
  const EMAILJS_TEMPLATE_ID = 'template_en4vgvo';
  const EMAILJS_PUBLIC_KEY = 'o_Bglgv3113ZCB4OP';
  // Внимание: при отправке письмо реально уходит через api.emailjs.com — это внешний
  // запрос из браузера покупателя (не с нашего сервера, его нет). Если у покупателя
  // заблокирован доступ к api.emailjs.com (в редких сетях бывает) — сработает
  // автоматический fallback на mailto (см. wireOrderForm).
  if (window.emailjs) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const i18n = new VVKi18n({ dictPath: 'data/i18n/', langs: ['ru','en','zh','hi'], default: 'ru', version: ASSET_VERSION });
  const cart = new VVKCart({ namespace: 'seitan' });

  let PRODUCTS = [];
  let CATEGORIES = [];
  let BRAND = null;
  let activeFilter = 'all';

  async function loadData(){
    const res = await fetch(`data/products.json?${ASSET_VERSION}`);
    const data = await res.json();
    PRODUCTS = data.products;
    CATEGORIES = data.categories;

    const brandRes = await fetch(`data/brand.json?${ASSET_VERSION}`);
    BRAND = await brandRes.json();
  }

  function productById(id){ return PRODUCTS.find(p => p.id === id); }

  function renderNetworkNotice(){
    document.getElementById('network-notice').classList.toggle('visible', i18n.lang === 'zh');
  }

  const LANG_FLAGS = {
    ru: `<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#1435a1"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/></svg>`,
    en: `<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#00247d"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#cf142b" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6.6"/><path d="M15 0V20M0 10H30" stroke="#cf142b" stroke-width="4"/></svg>`,
    zh: `<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#de2910"/><g fill="#ffde00"><circle cx="6" cy="6" r="2.6"/><circle cx="12.5" cy="2.3" r="0.8"/><circle cx="14.7" cy="6.9" r="0.8"/><circle cx="14" cy="10.7" r="0.8"/><circle cx="11" cy="9.5" r="0.8"/></g></svg>`,
    hi: `<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="6.67" fill="#ff9933"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" stroke-width="0.5"/></svg>`
  };

  function pad(n){ return String(n).padStart(2, '0'); }

  function startClock(){
    const el = document.getElementById('header-clock');
    function tick(){
      const d = new Date();
      // Универсальный формат ISO-подобный — без региональной неоднозначности (день/месяц не перепутать)
      const str = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      el.textContent = str;
    }
    tick();
    setInterval(tick, 1000);
  }

  function renderBrandAccordion(){
    const el = document.getElementById('brand-accordion');
    const lang = i18n.lang;
    const b = BRAND;

    const valuesHtml = b.values.items.map(v => `
      <div><div class="v-title">${v.title[lang] || v.title.en}</div><div>${v.body[lang] || v.body.en}</div></div>
    `).join('');

    const assortmentHtml = `<p>${b.assortment.intro[lang] || b.assortment.intro.en}</p>` + b.assortment.categories.map(c => `
      <div style="margin-top:14px"><div class="v-title">${c.title[lang] || c.title.en}</div><div>${c.body[lang] || c.body.en}</div></div>
    `).join('');

    const stepsHtml = b.production_steps.steps.map((s, i) => `
      <div><div class="s-title"><span class="s-num">${i+1}.</span> ${s.title[lang] || s.title.en}</div><div>${s.body[lang] || s.body.en}</div></div>
    `).join('') + `<p style="margin-top:14px">${b.production_steps.founder_note[lang] || b.production_steps.founder_note.en}</p>`;

    const advHtml = `<ul class="adv-list">` + b.advantages.items.map(a => `<li>${a[lang] || a.en}</li>`).join('') + `</ul>
      <div class="adv-closing">${b.advantages.closing[lang] || b.advantages.closing.en}</div>`;

    const st = b.storage_transport;
    const storageHtml = `<div class="storage-grid">
      <div><div class="label">${lang==='ru'?'Заморозка':lang==='zh'?'冷冻':lang==='hi'?'फ्रोज़न':'Frozen'}</div>${st.frozen[lang] || st.frozen.en}</div>
      <div><div class="label">${lang==='ru'?'Охлаждённо':lang==='zh'?'冷藏':lang==='hi'?'चिल्ड':'Chilled'}</div>${st.chilled[lang] || st.chilled.en}</div>
      <div><div class="label">${lang==='ru'?'Транспортировка':lang==='zh'?'运输':lang==='hi'?'परिवहन':'Transport'}</div>${st.transport[lang] || st.transport.en}</div>
    </div>`;

    const sections = [
      { title: b.concept.title, body: `<p>${b.concept.body[lang] || b.concept.body.en}</p><div class="mission"><div class="mission-label">${b.concept.mission_label[lang] || b.concept.mission_label.en}</div>${b.concept.mission[lang] || b.concept.mission.en}</div>` },
      { title: b.values.title, body: `<div class="values-grid">${valuesHtml}</div>` },
      { title: b.assortment.title, body: assortmentHtml },
      { title: b.production_steps.title, body: `<div class="steps-grid">${stepsHtml}</div>` },
      { title: b.advantages.title, body: advHtml },
      { title: b.storage_transport.title, body: storageHtml },
    ];

    el.innerHTML = sections.map((s, i) => `
      <div class="acc-item${i===0 ? ' open' : ''}" data-idx="${i}">
        <div class="acc-head"><span><span class="num">0${i+1}</span>${s.title[lang] || s.title.en}</span><span class="arrow">▾</span></div>
        <div class="acc-body">${s.body}</div>
      </div>
    `).join('');

    el.querySelectorAll('.acc-head').forEach(head => {
      head.addEventListener('click', () => {
        head.parentElement.classList.toggle('open');
      });
    });
  }

  function renderIngredients(){
    const el = document.getElementById('ingredients-container');
    const lang = i18n.lang;
    const ing = BRAND.ingredients;

    const featuresHtml = ing.features.map(f => `
      <div class="ing-feature">
        <div class="ing-icon">${f.icon}</div>
        <div class="ing-title">${f.title[lang] || f.title.en}</div>
        <div class="ing-body">${f.body[lang] || f.body.en}</div>
      </div>
    `).join('');

    // Честная плашка про халяль — статус реальный (в процессе), не выдаваемый за "не требуется"
    const halalFeature = `
      <div class="ing-feature warn">
        <div class="ing-icon">⏳</div>
        <div class="ing-title">${i18n.t('about_halal_title')}</div>
        <div class="ing-body">${i18n.t('about_halal_sub')}</div>
      </div>`;

    const freeOfHtml = ing.free_of.map(x => `<span>${x[lang] || x.en}</span>`).join('');

    el.innerHTML = `
      <h2>${ing.title[lang] || ing.title.en}</h2>
      <p class="ing-intro">${ing.intro[lang] || ing.intro.en}</p>
      <div class="ing-features">${featuresHtml}${halalFeature}</div>
      <div class="free-of-strip">${freeOfHtml}</div>
    `;
  }

  function renderAudience(){
    const el = document.getElementById('audience-container');
    const lang = i18n.lang;
    const aud = BRAND.audience;

    const cardsHtml = aud.groups.map(g => `
      <div class="audience-card">
        <div class="aud-icon">${g.icon}</div>
        <div class="aud-title">${g.title[lang] || g.title.en}</div>
        <div class="aud-body">${g.body[lang] || g.body.en}</div>
      </div>
    `).join('');

    el.innerHTML = `<h2>${aud.title[lang] || aud.title.en}</h2><div class="audience-grid">${cardsHtml}</div>`;
  }

  function renderLangSwitch(){
    const el = document.getElementById('lang-switch');
    el.innerHTML = i18n.langs.map(l =>
      `<button data-lang-btn="${l}"><span class="flag">${LANG_FLAGS[l] || ''}</span> ${l.toUpperCase()}</button>`
    ).join('');
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => i18n.setLang(btn.getAttribute('data-lang-btn')));
    });
  }

  function renderFilters(){
    const el = document.getElementById('filters');
    const allBtn = `<button data-filter="all" class="${activeFilter==='all'?'active':''}">${i18n.t('filter_all')}</button>`;
    const catBtns = CATEGORIES.map(c =>
      `<button data-filter="${c.id}" class="${activeFilter===c.id?'active':''}">${c.name[i18n.lang] || c.name.en}</button>`
    ).join('');
    el.innerHTML = allBtn + catBtns;
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter');
        renderFilters();
        renderCatalog();
      });
    });
  }

  function compositionPreview(text){
    if (!text) return '—';
    return text.length > 90 ? text.slice(0, 90) + '…' : text;
  }

  function openLightbox(src){
    let box = document.getElementById('vvk-lightbox');
    if (!box){
      box = document.createElement('div');
      box.id = 'vvk-lightbox';
      box.className = 'vvk-lightbox';
      box.innerHTML = '<img alt="">';
      box.addEventListener('click', () => box.classList.remove('open'));
      document.body.appendChild(box);
    }
    box.querySelector('img').src = src;
    box.classList.add('open');
  }

  function renderCatalog(){
    const grid = document.getElementById('grid');
    const lang = i18n.lang;
    const list = activeFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeFilter);

    grid.innerHTML = list.map(p => {
      const name = p.name[lang] || p.name.en || p.name.ru;
      const comp = p.composition[lang] || p.composition.en || p.composition.ru || '';
      const halalBadge = p.halal_status === 'pending'
        ? `<span class="badge warn">${i18n.t('card_halal_pending')}</span>` : '';
      const inCart = cart.items[p.id] || 0;
      const catObj = CATEGORIES.find(c => c.id === p.category);
      const catName = catObj ? (catObj.name[lang] || catObj.name.en) : '';

      const hasPhoto = p.images && p.images.length > 0;
      const mainPhoto = hasPhoto ? p.images[0].file : null;

      const thumbInner = hasPhoto
        ? `<img src="assets/img/products/${mainPhoto}" alt="${name}" loading="lazy">`
        : `${name}<br><span style="opacity:.6">(фото → assets/img/products/${p.id}.jpg)</span>`;

      const galleryHtml = (p.images && p.images.length > 1)
        ? `<div class="card-gallery">${p.images.map(img => `<img src="assets/img/products/${img.file}" alt="" loading="lazy" data-lightbox="assets/img/products/${img.file}">`).join('')}</div>`
        : '';

      const aboutText = p.about && (p.about[lang] || p.about.en);
      const nut = p.nutrition_per_100g;
      const hasFullNutrition = nut && nut.protein_g != null && nut.fat_g != null && nut.carb_g != null && nut.kcal != null;

      return `
      <div class="card" data-id="${p.id}">
        <span class="cat-tag">${catName}</span>
        <div class="thumb${hasPhoto ? ' has-photo' : ''}" ${hasPhoto ? `data-lightbox="assets/img/products/${mainPhoto}"` : ''}>
          <span class="weight-stamp">${p.weight_g}<small>g</small></span>
          ${thumbInner}
        </div>
        <h3>${name}</h3>
        <div class="badges">
          <span class="badge">${i18n.t('card_allergen_gluten')}</span>
          ${halalBadge}
        </div>
        <div class="comp-preview">${compositionPreview(comp)}</div>
        <div class="card-actions">
          <button class="btn secondary" data-action="expand">${i18n.t('card_details')}</button>
          <div class="qty-stepper">
            <button type="button" data-action="qty-minus" aria-label="-">−</button>
            <input type="number" min="1" value="1" data-qty-input>
            <button type="button" data-action="qty-plus" aria-label="+">+</button>
          </div>
          <button class="btn" data-action="add">${inCart ? i18n.t('card_added') + ' ✓ (' + inCart + ')' : i18n.t('card_add')}</button>
        </div>
        <div class="card-detail">
          ${aboutText ? `<dt>${i18n.t('card_about')}</dt><dd>${aboutText}</dd>` : ''}
          <dt>${i18n.t('card_composition')}</dt><dd>${comp}</dd>
          ${galleryHtml}
          <dt>${i18n.t('card_shelf_life')}</dt><dd>${p.shelf_life_months} ${i18n.t('card_shelf_life_value').replace('{temp}', p.storage_temp_c)}</dd>
          ${hasFullNutrition ? `
          <dt>${i18n.t('card_nutrition')}</dt>
          <dd><table class="nutri-table">
            <tr><td>${i18n.t('nutri_protein')}</td><td>${nut.protein_g} g</td></tr>
            <tr><td>${i18n.t('nutri_fat')}</td><td>${nut.fat_g} g</td></tr>
            <tr><td>${i18n.t('nutri_carb')}</td><td>${nut.carb_g} g</td></tr>
            <tr><td>${i18n.t('nutri_kcal')}</td><td>${nut.kcal} kcal</td></tr>
          </table></dd>` : (nut && nut.protein_g ? `<dt>Белок / Protein</dt><dd>${nut.protein_g} г/100г</dd>` : '')}
          ${p.ingredient_flag ? `<dt>⚠</dt><dd>${p.ingredient_flag[lang] || p.ingredient_flag.en}</dd>` : ''}
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-lightbox]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(el.getAttribute('data-lightbox'));
      });
    });

    grid.querySelectorAll('.card').forEach(card => {
      const id = card.getAttribute('data-id');
      const qtyInput = card.querySelector('[data-qty-input]');

      card.querySelector('[data-action="expand"]').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
      card.querySelector('[data-action="qty-minus"]').addEventListener('click', () => {
        qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
      });
      card.querySelector('[data-action="qty-plus"]').addEventListener('click', () => {
        qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
      });
      card.querySelector('[data-action="add"]').addEventListener('click', () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        cart.add(id, qty);
        renderCatalog();
        renderCart();
      });
    });
  }

  function renderCart(){
    const body = document.getElementById('cart-body');
    const countEl = document.getElementById('cart-count');
    const summaryEl = document.getElementById('cart-summary-line');
    const ids = Object.keys(cart.items);
    countEl.textContent = cart.count();

    if (ids.length === 0){
      summaryEl.textContent = '';
      body.innerHTML = `<div class="cart-empty">${i18n.t('cart_empty')}</div>`;
      return;
    }

    // Краткая сводка "что и сколько" — видна и когда панель свёрнута, каждая позиция с новой строки
    summaryEl.innerHTML = ids.map(id => {
      const p = productById(id);
      if (!p) return '';
      const name = p.name[i18n.lang] || p.name.en || p.name.ru;
      return `<div class="summary-row"><span class="summary-name">${name}</span> <span class="summary-qty">×${cart.items[id]}</span></div>`;
    }).filter(Boolean).join('');

    body.innerHTML = ids.map(id => {
      const p = productById(id);
      if (!p) return '';
      const name = p.name[i18n.lang] || p.name.en || p.name.ru;
      return `
      <div class="cart-item" data-id="${id}">
        <span class="name">${name} <span style="opacity:.6">(${p.weight_g} г)</span></span>
        <input type="number" min="1" value="${cart.items[id]}" data-qty />
        <button class="remove" data-remove>${i18n.t('cart_remove')}</button>
      </div>`;
    }).join('');

    body.querySelectorAll('.cart-item').forEach(row => {
      const id = row.getAttribute('data-id');
      row.querySelector('[data-qty]').addEventListener('change', e => {
        cart.setQty(id, parseInt(e.target.value, 10) || 1);
        renderCart(); renderCatalog();
      });
      row.querySelector('[data-remove]').addEventListener('click', () => {
        cart.remove(id);
        renderCart(); renderCatalog();
      });
    });
  }

  function buildOrderText(formData){
    const lines = [];
    lines.push('=== Заказ образцов (бесплатно) / Order for samples (free of charge) — Высший Вкус ===');
    lines.push('');
    Object.keys(cart.items).forEach(id => {
      const p = productById(id);
      if (!p) return;
      const name = p.name.ru + ' / ' + (p.name.en || '');
      lines.push(`- ${name} — ${p.weight_g} г × ${cart.items[id]} уп.`);
    });
    lines.push('');
    lines.push(`Компания: ${formData.company || '—'}`);
    lines.push(`Страна: ${formData.country || '—'}`);
    lines.push(`Контактное лицо: ${formData.contact || '—'}`);
    lines.push(`Email: ${formData.email || '—'}`);
    lines.push(`Телефон/WhatsApp: ${formData.phone || '—'}`);
    lines.push(`Целевой рынок: ${formData.market || '—'}`);
    lines.push(`Адрес доставки: ${formData.postal || ''}, ${formData.city || ''}, ${formData.street || ''} ${formData.building || ''}${formData.apt ? ', ' + formData.apt : ''}`);
    if (formData.comment) lines.push(`Комментарий: ${formData.comment}`);
    return lines.join('\n');
  }

  function formIsValid(form){
    if (!form.checkValidity()){
      form.reportValidity();
      return false;
    }
    if (cart.isEmpty()){
      alert(i18n.t('cart_empty'));
      return false;
    }
    return true;
  }

  let lastOrderEmail = '';

  function showThankYou(email){
    lastOrderEmail = email || '';
    document.getElementById('order-form').classList.remove('open');
    const el = document.getElementById('thankyou');
    const countdownEl = document.getElementById('thankyou-countdown');
    el.querySelector('.thankyou-text').textContent = i18n.t('thankyou_message', { email: lastOrderEmail || '—' });
    el.classList.add('visible');

    // Обратный счётчик — плашка автоматически очищается и сворачивается через 30 секунд, готова к новому заказу
    clearInterval(window._vvkThankYouTimer);
    let secondsLeft = 30;
    const tick = () => {
      countdownEl.textContent = i18n.t('thankyou_countdown', { seconds: secondsLeft });
      if (secondsLeft <= 0){
        clearInterval(window._vvkThankYouTimer);
        el.classList.remove('visible');
        cart.clear();
        renderCatalog();
        renderCart();
        document.getElementById('cart-panel').classList.add('collapsed');
        return;
      }
      secondsLeft--;
    };
    tick();
    window._vvkThankYouTimer = setInterval(tick, 1000);
  }

  function wireOrderForm(){
    const toggleBtn = document.getElementById('cart-checkout-btn');
    const form = document.getElementById('order-form');
    toggleBtn.addEventListener('click', () => {
      document.getElementById('thankyou').classList.remove('visible');
      form.classList.toggle('open');
    });

    document.getElementById('submit-order').addEventListener('click', async () => {
      if (!formIsValid(form)) return;
      const formData = readForm();
      const btn = document.getElementById('submit-order');
      const originalLabel = btn.textContent;

      // 1) Настоящий PDF — скачивается сразу на устройство покупателя (это функция браузера,
      //    не зависит от тарифа EmailJS)
      buildProformaPdf(formData);
      const text = buildOrderText(formData);
      const addressLine = [formData.street, formData.building, formData.apt].filter(Boolean).join(', ');

      const templateParams = {
        to_email: MANAGER_EMAIL,       // основной получатель — производство
        cc_email: formData.email,      // копия покупателю (в шаблоне EmailJS поле CC должно быть {{cc_email}})
        reply_to: formData.email,
        company: formData.company,
        contact: formData.contact,
        phone: formData.phone,
        email: formData.email,
        country: formData.country,
        market: formData.market,
        delivery_address: `${addressLine}, ${formData.city}, ${formData.postal}, ${formData.country}`,
        order_text: text,
        comment: formData.comment || '—'
        // pdf_attachment убран: на бесплатном тарифе EmailJS вложения (Static/Dynamic) недоступны —
        // требуют платного плана Personal ($9/мес) и выше. Если апгрейднете — верните этот параметр
        // и настройте в шаблоне Dynamic Attachment с именем pdf_attachment.
      };

      let sentByEmailJS = false;
      if (window.emailjs){
        btn.textContent = '…';
        btn.disabled = true;
        try{
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
          sentByEmailJS = true;
        }catch(e){
          console.error('EmailJS send failed, falling back to mailto:', e);
        }
        btn.textContent = originalLabel;
        btn.disabled = false;
      }

      // 2) Честный fallback — если EmailJS недоступен/не настроен/заблокирован у покупателя,
      //    открываем черновик письма вместо тихой потери заказа
      if (!sentByEmailJS){
        const subject = encodeURIComponent('Order for samples — Высший Вкус / Vysshiy Vkus');
        const body = encodeURIComponent(text + '\n\n[Приложите скачанный PDF pro-forma к этому письму перед отправкой]');
        const cc = encodeURIComponent(formData.email || '');
        window.location.href = `mailto:${MANAGER_EMAIL}?cc=${cc}&subject=${subject}&body=${body}`;
      }

      showThankYou(formData.email);
    });

    document.getElementById('submit-copy').addEventListener('click', async () => {
      if (!formIsValid(form)) return;
      const text = buildOrderText(readForm());
      try{
        await navigator.clipboard.writeText(text);
      }catch(e){
        console.error(e);
        alert(text); // запасной вариант — показать текст, если буфер обмена недоступен
      }
    });
  }

  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildProformaPdf(formData){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const ids = Object.keys(cart.items);

    const now = new Date();
    const ref = 'PF-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + String(now.getTime()).slice(-4);
    const dateStr = now.toISOString().slice(0,10);
    const addressLine = [formData.street, formData.building, formData.apt].filter(Boolean).join(' ');

    const marginL = 15;
    let y = 20;

    if (window.LOGO_BASE64){
      try{ doc.addImage(window.LOGO_BASE64, 'PNG', marginL, 8, 32, 12.7); }catch(e){ console.error('logo in PDF failed', e); }
      y = 30;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('ORDER FOR SAMPLES', marginL, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`Reference: ${ref}   ·   Date: ${dateStr}`, marginL, y);
    doc.setTextColor(0);
    y += 10;

    function block(title, lines){
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(title.toUpperCase(), marginL, y);
      y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      lines.forEach(line => { doc.text(line, marginL, y); y += 5; });
      y += 3;
    }

    block('Seller / Manufacturer', [
      'Vysshiy Vkus LLC (OOO "Vysshiy Vkus")',
      'Office: Beregovaya str. 146, bld. 19, unit 3/82, Krasnodar, Russia',
      'Production: Smolenskoe hwy 44, Seversky, Afipskiy, Krasnodar Region, Russia',
      'INN: 2311236404'
    ]);
    block('Recipient (samples shipped free of charge)', [
      String(formData.company||''), `Attn: ${formData.contact||''}`,
      addressLine, `${formData.city||''}, ${formData.postal||''}, ${formData.country||''}`,
      `Tel: ${formData.phone||''}   Email: ${formData.email||''}`,
      `Target market: ${formData.market||''}`
    ]);

    y += 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const colX = { no: marginL, name: marginL+10, weight: marginL+110, qty: marginL+140, total: marginL+165 };
    doc.text('#', colX.no, y); doc.text('Product', colX.name, y); doc.text('Unit wt', colX.weight, y);
    doc.text('Qty', colX.qty, y); doc.text('Total wt', colX.total, y);
    y += 2;
    doc.setLineWidth(0.2); doc.line(marginL, y, 195, y);
    y += 5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    let totalPacks = 0, totalKg = 0;
    ids.forEach((id, i) => {
      const p = productById(id);
      if (!p) return;
      const qty = cart.items[id];
      const kg = p.weight_g * qty / 1000;
      totalPacks += qty; totalKg += kg;
      const name = (p.name.en || p.name.ru);
      doc.text(String(i+1), colX.no, y);
      doc.text(name.length > 42 ? name.slice(0,42)+'…' : name, colX.name, y);
      doc.text(`${p.weight_g} g`, colX.weight, y);
      doc.text(String(qty), colX.qty, y);
      doc.text(`${kg.toFixed(2)} kg`, colX.total, y);
      y += 6;
      if (y > 270){ doc.addPage(); y = 20; }
    });

    y += 2; doc.line(marginL, y, 195, y); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${totalPacks} packs   /   ${totalKg.toFixed(2)} kg`, colX.qty, y);
    y += 12;

    if (formData.comment){
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(`Comment: ${formData.comment}`, marginL, y, { maxWidth: 180 });
      y += 10;
    }

    doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Samples are provided free of charge for evaluation purposes. This document is not a commercial invoice', marginL, y); y += 4;
    doc.text('and has no monetary value. Final commercial terms for a wholesale order will be confirmed separately.', marginL, y);
    doc.setTextColor(0);

    y += 20;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('PIC: Dmitry Skobtsov, +7 919 990 35 00', marginL, y);

    const filename = `${ref}-VysshiyVkus.pdf`;
    doc.save(filename);
    const base64 = doc.output('datauristring'); // полная data-uri строка — то, что ждёт EmailJS variable attachment
    return { ref, filename, base64 };
  }

  function readForm(){
    return {
      company: document.getElementById('f-company').value,
      country: document.getElementById('f-country').value,
      contact: document.getElementById('f-contact').value,
      email: document.getElementById('f-email').value,
      phone: document.getElementById('f-phone').value,
      market: document.getElementById('f-market').value,
      postal: document.getElementById('f-postal').value,
      city: document.getElementById('f-city').value,
      street: document.getElementById('f-street').value,
      building: document.getElementById('f-building').value,
      apt: document.getElementById('f-apt').value,
      comment: document.getElementById('f-comment').value,
    };
  }

  function wireCartToggle(){
    document.getElementById('cart-head').addEventListener('click', () => {
      document.getElementById('cart-panel').classList.toggle('collapsed');
    });
  }

  // --- запуск ---
  await loadData();
  await i18n.init();
  renderLangSwitch();
  renderFilters();
  renderCatalog();
  renderCart();
  renderNetworkNotice();
  renderBrandAccordion();
  renderIngredients();
  renderAudience();
  startClock();
  wireOrderForm();
  wireCartToggle();

  i18n.onChange(() => {
    renderFilters();
    renderCatalog();
    renderCart();
    renderNetworkNotice();
    renderBrandAccordion();
    renderIngredients();
    renderAudience();
    if (document.getElementById('thankyou').classList.contains('visible')){
      showThankYou(lastOrderEmail);
    }
  });
  cart.onChange(() => { /* renderCart уже вызывается явно в обработчиках выше */ });

})();
