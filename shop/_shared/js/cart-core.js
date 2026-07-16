/* ============================================================
   VVK SHOP — общая логика "сборки тестового заказа".
   По умолчанию корзина НЕ переживает перезагрузку страницы —
   каждое открытие страницы начинается с чистого заказа.
   Если для какой-то будущей линейки нужна персистентность между
   визитами — передать { persist: true }.
   Использование:
     const cart = new VVKCart({ namespace: 'seitan' });
     cart.add('doktorskaya');
     cart.setQty('doktorskaya', 3);
     cart.onChange(() => renderCart());
   ============================================================ */
class VVKCart {
  constructor(opts){
    this.key = `vvk_cart_${(opts && opts.namespace) || 'default'}`;
    this.persist = !!(opts && opts.persist);
    this.items = this._load();
    this._listeners = [];
  }

  _load(){
    if (!this.persist) return {};
    try{ return JSON.parse(localStorage.getItem(this.key)) || {}; }
    catch(e){ return {}; }
  }

  _save(){
    if (this.persist) localStorage.setItem(this.key, JSON.stringify(this.items));
    this._listeners.forEach(fn => fn(this.items));
  }

  add(productId, qty = 1){
    this.items[productId] = (this.items[productId] || 0) + qty;
    this._save();
  }

  setQty(productId, qty){
    if (qty <= 0) { this.remove(productId); return; }
    this.items[productId] = qty;
    this._save();
  }

  remove(productId){
    delete this.items[productId];
    this._save();
  }

  clear(){
    this.items = {};
    this._save();
  }

  count(){
    return Object.values(this.items).reduce((a,b) => a+b, 0);
  }

  isEmpty(){
    return Object.keys(this.items).length === 0;
  }

  onChange(fn){ this._listeners.push(fn); }
}
