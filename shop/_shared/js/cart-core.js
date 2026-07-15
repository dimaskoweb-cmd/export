/* ============================================================
   VVK SHOP — общая логика "сборки тестового заказа".
   Хранит { productId: qty } в localStorage под namespace, чтобы
   разные product-линейки (/shop/Seitan, /shop/product2, ...) не
   затирали корзины друг друга.
   Использование:
     const cart = new VVKCart({ namespace: 'seitan' });
     cart.add('doktorskaya');
     cart.setQty('doktorskaya', 3);
     cart.onChange(() => renderCart());
   ============================================================ */
class VVKCart {
  constructor(opts){
    this.key = `vvk_cart_${(opts && opts.namespace) || 'default'}`;
    this.items = this._load();
    this._listeners = [];
  }

  _load(){
    try{ return JSON.parse(localStorage.getItem(this.key)) || {}; }
    catch(e){ return {}; }
  }

  _save(){
    localStorage.setItem(this.key, JSON.stringify(this.items));
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
