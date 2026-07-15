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

  const MANAGER_EMAIL = 'orders@vysshiyvkus.example'; // TODO: заменить на реальный email менеджера
  const CONTACT_MODE = 'simple'; // приёмник заказа: mailto + копирование текста (без внешних сервисов)

  const i18n = new VVKi18n({ dictPath: 'data/i18n/', langs: ['ru','en','zh','hi'], default: 'ru' });
  const cart = new VVKCart({ namespace: 'seitan' });

  let PRODUCTS = [];
  let CATEGORIES = [];
  let activeFilter = 'all';

  async function loadData(){
    const res = await fetch('data/products.json');
    const data = await res.json();
    PRODUCTS = data.products;
    CATEGORIES = data.categories;
  }

  function productById(id){ return PRODUCTS.find(p => p.id === id); }

  function renderNetworkNotice(){
    document.getElementById('network-notice').classList.toggle('visible', i18n.lang === 'zh');
  }

  const LANG_FLAGS = { ru: '🇷🇺', en: '🇬🇧', zh: '🇨🇳', hi: '🇮🇳' };

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

      return `
      <div class="card" data-id="${p.id}">
        <span class="cat-tag">${catName}</span>
        <div class="thumb">
          <span class="weight-stamp">${p.weight_g}<small>g</small></span>
          ${name}<br><span style="opacity:.6">(фото → assets/img/products/${p.id}.jpg)</span>
        </div>
        <h3>${name}</h3>
        <div class="badges">
          <span class="badge">${i18n.t('card_allergen_gluten')}</span>
          ${halalBadge}
        </div>
        <div class="comp-preview">${compositionPreview(comp)}</div>
        <div class="card-actions">
          <button class="btn secondary" data-action="expand">${i18n.t('card_details')}</button>
          <button class="btn" data-action="add">${inCart ? i18n.t('card_added') + ' ✓' : i18n.t('card_add')}</button>
        </div>
        <div class="card-detail">
          <dt>${i18n.t('card_composition')}</dt><dd>${comp}</dd>
          <dt>${i18n.t('card_shelf_life')}</dt><dd>${p.shelf_life_months} ${i18n.t('card_shelf_life_value').replace('{temp}', p.storage_temp_c)}</dd>
          ${p.nutrition_per_100g && p.nutrition_per_100g.protein_g ? `<dt>Белок / Protein</dt><dd>${p.nutrition_per_100g.protein_g} г/100г</dd>` : ''}
          ${p.ingredient_flag ? `<dt>⚠</dt><dd>${p.ingredient_flag}</dd>` : ''}
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.card').forEach(card => {
      const id = card.getAttribute('data-id');
      card.querySelector('[data-action="expand"]').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
      card.querySelector('[data-action="add"]').addEventListener('click', () => {
        cart.add(id, 1);
        renderCatalog();
        renderCart();
      });
    });
  }

  function renderCart(){
    const body = document.getElementById('cart-body');
    const countEl = document.getElementById('cart-count');
    const ids = Object.keys(cart.items);
    countEl.textContent = cart.count();

    if (ids.length === 0){
      body.innerHTML = `<div class="cart-empty">${i18n.t('cart_empty')}</div>`;
      return;
    }

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
    lines.push('=== Тестовый заказ / Trial order — Высший Вкус ===');
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

  function showThankYou(){
    document.getElementById('order-form').classList.remove('open');
    document.getElementById('thankyou').classList.add('visible');
  }

  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function openProforma(formData){
    const ids = Object.keys(cart.items);
    const rows = ids.map((id, i) => {
      const p = productById(id);
      if (!p) return '';
      const qty = cart.items[id];
      const totalKg = (p.weight_g * qty / 1000).toFixed(2);
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(p.name.en || p.name.ru)}</td>
        <td class="num">${p.weight_g} g</td>
        <td class="num">${qty}</td>
        <td class="num">${totalKg} kg</td>
      </tr>`;
    }).join('');

    const totalPacks = ids.reduce((sum, id) => sum + cart.items[id], 0);
    const totalKg = ids.reduce((sum, id) => {
      const p = productById(id);
      return sum + (p ? p.weight_g * cart.items[id] / 1000 : 0);
    }, 0).toFixed(2);

    const now = new Date();
    const ref = 'PF-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + String(now.getTime()).slice(-4);
    const dateStr = now.toISOString().slice(0,10);

    const addressLine = [formData.street, formData.building, formData.apt].filter(Boolean).join(' ');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Pro-Forma Invoice ${ref}</title>
<style>
  @page{ size:A4; margin:18mm; }
  body{ font-family:'Inter',Arial,sans-serif; font-size:12px; color:#231f1a; }
  h1{ font-size:20px; margin:0 0 4px; }
  .ref{ font-family:'JetBrains Mono',monospace; font-size:11px; color:#5c5648; margin-bottom:20px; }
  .cols{ display:flex; justify-content:space-between; gap:24px; margin-bottom:20px; }
  .col{ flex:1; }
  .col h2{ font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#5b6b3f; border-bottom:1px solid #ddd; padding-bottom:4px; margin-bottom:8px; }
  table{ width:100%; border-collapse:collapse; margin:16px 0; }
  th,td{ border:1px solid #ccc; padding:6px 8px; text-align:left; font-size:11px; }
  th{ background:#f2efe4; }
  td.num, th.num{ text-align:right; }
  tfoot td{ font-weight:700; background:#f7f5ee; }
  .note{ font-size:10px; color:#5c5648; margin-top:18px; line-height:1.5; }
  .sign{ display:flex; justify-content:space-between; margin-top:60px; }
  .sign div{ width:45%; border-top:1px solid #999; padding-top:6px; font-size:10px; }
  @media print{ .no-print{ display:none; } }
</style></head><body>
  <button class="no-print" onclick="window.print()" style="float:right">Print</button>
  <h1>PRO-FORMA INVOICE — TRIAL ORDER</h1>
  <div class="ref">Reference: ${ref} &nbsp;·&nbsp; Date: ${dateStr}</div>

  <div class="cols">
    <div class="col">
      <h2>Seller / Manufacturer</h2>
      Vysshiy Vkus LLC (ООО «Высший Вкус»)<br>
      Afipsky, Krasnodar Region, Russia
    </div>
    <div class="col">
      <h2>Buyer</h2>
      ${escapeHtml(formData.company)}<br>
      Attn: ${escapeHtml(formData.contact)}<br>
      Tel: ${escapeHtml(formData.phone)} &nbsp;·&nbsp; Email: ${escapeHtml(formData.email)}
    </div>
    <div class="col">
      <h2>Delivery address</h2>
      ${escapeHtml(addressLine)}<br>
      ${escapeHtml(formData.city)}, ${escapeHtml(formData.postal)}<br>
      ${escapeHtml(formData.country)} &nbsp;·&nbsp; Target market: ${escapeHtml(formData.market)}
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Product</th><th class="num">Unit weight</th><th class="num">Qty (packs)</th><th class="num">Total weight</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3"></td><td class="num">${totalPacks}</td><td class="num">${totalKg} kg</td></tr></tfoot>
  </table>

  ${formData.comment ? `<div><strong>Comment:</strong> ${escapeHtml(formData.comment)}</div>` : ''}

  <div class="note">
    This is a pro-forma document for a trial/sample order, for reference purposes only and does not constitute a binding commercial invoice.
    Final commercial terms (Incoterms, payment terms, lead time, certification status) will be confirmed separately in writing.
  </div>

  <div class="sign">
    <div>For the Seller</div>
    <div>For the Buyer</div>
  </div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win){ alert('Please allow pop-ups to view the pro-forma document.'); return; }
    win.document.write(html);
    win.document.close();
  }

  function wireOrderForm(){
    const toggleBtn = document.getElementById('cart-checkout-btn');
    const form = document.getElementById('order-form');
    toggleBtn.addEventListener('click', () => {
      document.getElementById('thankyou').classList.remove('visible');
      form.classList.toggle('open');
    });

    document.getElementById('submit-email').addEventListener('click', () => {
      if (!formIsValid(form)) return;
      const text = buildOrderText(readForm());
      const subject = encodeURIComponent('Trial order — Высший Вкус');
      const body = encodeURIComponent(text);
      window.location.href = `mailto:${MANAGER_EMAIL}?subject=${subject}&body=${body}`;
      showThankYou();
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
      showThankYou();
    });

    document.getElementById('print-proforma').addEventListener('click', () => {
      if (!formIsValid(form)) return;
      openProforma(readForm());
    });
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
  wireOrderForm();
  wireCartToggle();

  i18n.onChange(() => {
    renderFilters();
    renderCatalog();
    renderCart();
    renderNetworkNotice();
  });
  cart.onChange(() => { /* renderCart уже вызывается явно в обработчиках выше */ });

})();
