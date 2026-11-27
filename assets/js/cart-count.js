(() => {
  const key='bazooka_shop_cart_v1';
  function update(){
    let count=0;
    try{const cart=JSON.parse(localStorage.getItem(key)||'[]');for(const item of cart)if(Number.isInteger(item.qty)&&item.qty>0)count+=item.qty;}catch{}
    document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=String(count));
  }
  update();
  window.addEventListener('pageshow',update);
  window.addEventListener('storage',update);
  window.addEventListener('shop:cart',update);
})();
