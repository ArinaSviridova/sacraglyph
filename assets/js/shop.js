(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const t = (ru, eng) => en ? eng : ru;
  const $ = (selector, root = document) => root.querySelector(selector);
  const cms = window.BazookaCMS;
  const store = 'bazooka_shop_cart_v1';
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const url = value => { try { const u = new URL(String(value||''), window.location.origin);
    return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  let products = [], cart = [], session = null, config = null, paypalInitialized = false, lastOrderId = null;

  try {
    const saved = JSON.parse(localStorage.getItem(store) || '[]');
    if(Array.isArray(saved)) cart = saved.filter(i => i && typeof i.id==='string'
      && Number.isInteger(i.qty) && i.qty>=1 && i.qty<=10 && typeof i.size==='string').slice(0,30);
  } catch { /* ignore stale cart */ }
  function notify(message, target='#shopNotice') { const el=$(target); if(el) el.textContent=message; }
  function saveCart() {localStorage.setItem(store, JSON.stringify(cart));renderCart();}
  function status(item) {
    const st = item.stockStatus || (item.inStock === false ? 'out' : 'in');
    return st === 'in' && item.inStock !== false ? 0 : 2;
  }
  function usd(item) {
    const entry=(item.prices||[]).find(p => String(p.currency||'').toUpperCase()==='USD');
    if(!entry) return null;
    const raw=String(entry.amount||'').replaceAll(' ','').replace(',','.');
    if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(raw)) return null;
    return Number(raw);
  }
  const cash = n => new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD'}).format(n);
  function title(item) { return en ? (item.titleEn || item.titleRu) : (item.titleRu || item.titleEn); }
  function image(item) { const src=item.images?.[0]?.url || item.images?.[0]?.jpg || item.image; return src ? url(src) : ''; }
  function clothing(item) {return /футбол|худи|толстов|свитшот|t-shirt|shirt|hoodie|sweatshirt/i.test(
    [item.titleRu,item.titleEn,item.categoryRu,item.categoryEn].join(' '));}

  function renderProducts() {
    const root=$('#shopProducts');
    if(!root) return;
    if(!products.length) {root.innerHTML='<p>'+t('Опубликованных товаров пока нет.','No published products yet.')+'</p>';return;}
    root.innerHTML=products.map(item => {
      const st=status(item), price=usd(item), sizes=clothing(item);
      const disabled=st===2||price===null||price<=0;
      return `<article class="shopProduct">
        ${image(item)?`<img src="${esc(image(item))}" alt="${esc(title(item))}" loading="lazy">`:''}
        ${(item.images||[]).length>1?`<div class="shopThumbs">${item.images.map((im,i)=>`<button type="button" data-gallery-src="${esc(url(im.url||im.jpg))}" aria-label="${t('Фото','Photo')} ${i+1}"><img src="${esc(url(im.url||im.jpg))}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
        <div class="shopProductBody">
          <small>${esc(en?item.collectionEn:item.collectionRu)}</small>
          <p class="shopStatus">${st===0?t('В наличии','In stock'):t('Нет в наличии','Out of stock')}</p>
          <h3>${esc(title(item))}</h3>
          <p>${esc(en ? item.descriptionEn : item.descriptionRu)}</p>
          <p class="shopPrice">${price?cash(price):t('Цена USD пока не указана','USD price not set')}</p>
          <div class="shopProductControl">
            ${sizes?`<label>${t('Размер','Size')} <select data-size-for="${esc(item.id)}"><option value="">-</option>${['XS','S','M','L','XL','XXL'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></label>`:''}
            <button data-shop-add="${esc(item.id)}" ${disabled?'disabled':''} type="button">${t('В корзину','Add to cart')}</button>
            <button class="shopSecondary" data-contact-product="${esc(item.id)}" type="button">${t('Написать мастеру','Message artist')}</button>
          </div>
          <div class="shopProductReviewSummary" data-review-summary-for="${esc(item.id)}"></div>
        </div>
      </article>`;
    }).join('');
  }

  function renderCart() {
    const el=$('#shopCart'), total=$('#cartTotal');
    if(!el||!total) return;
    const lines=cart.map(entry=>({entry,item:products.find(p=>p.id===entry.id)})).filter(x=>x.item);
    $('#cartCount').textContent=String(cart.reduce((n,i)=>n+i.qty,0));
    if(!lines.length) {el.innerHTML='<p>'+t('Корзина пуста.','Your cart is empty.')+'</p>';total.innerHTML='';return;}
    el.innerHTML=lines.map(({entry,item})=>`
      <div class="shopLine"><div class="shopLineTitle">${esc(title(item))}</div>
        <div class="shopLineMeta">${esc(entry.size||t('Один размер','One size'))} · ${usd(item)===null?t('Цена не указана','No price'):cash(usd(item))}</div>
        <div class="shopLineActions">
          <button data-qty="-1" data-id="${esc(entry.id)}" data-size="${esc(entry.size)}" type="button" aria-label="Remove one">−</button>
          <span>${entry.qty}</span>
          <button data-qty="1" data-id="${esc(entry.id)}" data-size="${esc(entry.size)}" type="button" aria-label="Add one">+</button>
          <button class="shopSecondary" data-remove-item data-id="${esc(entry.id)}" data-size="${esc(entry.size)}" type="button">${t('Удалить','Remove')}</button>
        </div></div>`).join('');
    const sum=lines.reduce((n,{item,entry})=>n+(usd(item)||0)*entry.qty,0);
    total.innerHTML=`<div class="shopTotal"><span>${t('Товары','Items')}</span><span>${cash(sum)}</span></div>`;
  }

  async function fetchProducts() {
    if(!cms?.isReady()) {notify(t('Supabase не настроен.','Supabase is not configured.'));return;}
    try {
      const content=await cms.getPublicContent();
      products=(content?.merchCollections||[]).flatMap(c=>c.items||[])
        .filter(i=>i && i.id).sort((a,b)=>status(a)-status(b));
      cart=cart.filter(line=>products.some(item=>item.id===line.id && status(item)===0));
      renderProducts();saveCart();
      window.dispatchEvent(new CustomEvent('bazooka:products',{detail:{products}}));
    } catch(error) {notify(t('Не удалось загрузить товары: ','Could not load products: ')+error.message);}
  }

  function delivery() {
    const f=$('#shopAddressForm');
    const get = name => String(f.elements.namedItem(name)?.value||'').trim();
    return { name:get('name'),phone:get('phone'),city:get('city'),street:get('street'),
      postal:get('postal'),country:get('country')};
  }
  function validCheckout() {
    if(!session) {notify(t('Сначала войди в аккаунт.','Please sign in first.'),'#shopCheckoutNotice');return false;}
    if(!cart.length) {notify(t('Корзина пуста.','Cart is empty.'),'#shopCheckoutNotice');return false;}
    if(!$('#shopAddressForm').reportValidity()) return false;
    if(!$('#shopAcceptTerms').checked) {notify(t('Подтверди тестовую покупку.','Confirm the test checkout.'),'#shopCheckoutNotice');return false;}
    return true;
  }
  async function backend(name, body) {
    const {data,error}=await cms.client.auth.getSession();
    if(error||!data.session?.access_token) throw new Error(t('Необходим вход в аккаунт.','Sign in required.'));
    const response=await fetch('/.netlify/functions/'+name,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error||'Checkout error');
    return result;
  }
  async function saveProfile(event) {
    event?.preventDefault();
    if(!session) return;
    if(!$('#shopAddressForm').reportValidity()) return;
    const addr=delivery();
    const {error}=await cms.client.from('shop_customer_profiles').upsert({
      user_id:session.user.id,display_name:addr.name,phone:addr.phone,
      address:{city:addr.city,street:addr.street,postal:addr.postal,country:addr.country},
      updated_at:new Date().toISOString()
    });
    notify(error?t('Не удалось сохранить адрес: ','Could not save address: ')+error.message:t('Адрес сохранён.','Address saved.'),'#shopCheckoutNotice');
  }
  async function loadProfile() {
    if(!session) return;
    const {data,error}=await cms.client.from('shop_customer_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
    if(error) {notify(error.message,'#shopCheckoutNotice');return;}
    if(!data) return;
    const f=$('#shopAddressForm');
    for(const [key,value] of Object.entries({
      name:data.display_name||'',phone:data.phone||'',city:data.address?.city||'',
      street:data.address?.street||'',postal:data.address?.postal||'',country:data.address?.country||'GE'
    })) {const field=f.elements.namedItem(key);if(field) field.value=value;}
  }
  async function loadOrders() {
    if(!session) return;
    const target=$('#shopOrders');
    const {data,error}=await cms.client.from('shop_orders')
      .select('id,status,currency,total_usd_cents,items,created_at,fulfillment_status,tracking_number,promo_code,discount_usd_cents')
      .eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(30);
    if(error) {target.textContent=error.message;return;}
    const deliveryLabels={
      new:t('Новый','New'),accepted:t('Принят','Accepted'),making:t('В изготовлении','In production'),
      packed:t('Собран','Packed'),shipped:t('В доставке','Shipped'),
      delivered:t('Доставлен','Delivered'),cancelled:t('Отменён','Cancelled')
    };
    const paymentLabels={pending:t('Ожидает оплаты','Payment pending'),paid:t('Оплачено','Paid'),
      cancelled:t('Отменено','Cancelled'),refunded:t('Возврат','Refunded')};
    target.innerHTML=(data||[]).length?(data||[]).map(o=>`<div class="shopOrder">
      <strong>${esc(o.id.slice(0,8))}</strong> · ${esc(new Date(o.created_at).toLocaleDateString(en?'en-US':'ru-RU'))}
      <div class="shopLineMeta">${esc(paymentLabels[o.status]||o.status)} · ${cash(o.total_usd_cents/100)} · ${Array.isArray(o.items)?o.items.length:0} ${t('позиций','items')}</div>
      <div class="shopLineMeta">${t('Доставка: ','Delivery: ')}${esc(deliveryLabels[o.fulfillment_status]||deliveryLabels.new)} ${o.tracking_number?'· '+t('трек: ','tracking: ')+esc(o.tracking_number):''}</div>
      <button class="shopSecondary" data-contact-order="${esc(o.id)}" type="button">${t('Написать по заказу','Ask about this order')}</button>
    </div>`).join(''):t('Заказов пока нет.','No orders yet.');
    window.dispatchEvent(new CustomEvent('bazooka:orders',{detail:{orders:data||[]}}));
  }
  async function initPaypal() {
    if(paypalInitialized||!session) return;
    try {
      const response=await fetch('/.netlify/functions/shop-config',{cache:'no-store'});
      if(!response.ok) throw new Error('Sandbox functions unavailable');
      config=await response.json();
      $('#shopDemoOrder').hidden=!config.localDemo;
      if(!config.ready||!config.clientId) {
        if(config.localDemo)return;
        notify(t('PayPal Sandbox не настроен. Добавь переменные окружения и запусти Netlify Dev.','PayPal Sandbox is not configured. Set server environment variables and run Netlify Dev.'),'#shopCheckoutNotice');
        return;
      }
      if(!/^[A-Za-z0-9_-]{8,200}$/.test(config.clientId)) throw new Error('Invalid public PayPal client ID');
      const script=document.createElement('script');
      script.src='https://www.sandbox.paypal.com/web-sdk/v6/core';
      script.onload=async () => {
        try {
          const sdk=await window.paypal.createInstance({
            clientId:config.clientId,components:['paypal-payments'],pageType:'checkout'
          });
          const eligible=await sdk.findEligibleMethods({currencyCode:'USD'});
          if(!eligible.isEligible('paypal')) {
            notify(t('PayPal недоступен для этого тестового покупателя.','PayPal is not eligible for this sandbox buyer.'),'#shopCheckoutNotice');
            return;
          }
          const paymentSession=sdk.createPayPalOneTimePaymentSession({
            onApprove:async ({orderId}) => {
              const captured=await backend('shop-capture-order',{orderId:lastOrderId,paypalOrderId:orderId});
              if(!captured.paid) throw new Error('Payment not completed');
              cart=[];saveCart();await loadOrders();
              notify(t('Тестовая оплата успешна. Заказ сохранён!','Sandbox payment completed. Order saved!'),'#shopCheckoutNotice');
              location.hash='#account';
            },
            onCancel:()=>notify(t('Тестовая оплата отменена.','Test payment cancelled.'),'#shopCheckoutNotice'),
            onError:error=>notify(t('Ошибка PayPal Sandbox: ','PayPal Sandbox error: ')+error.message,'#shopCheckoutNotice')
          });
          const container=$('#shopPaypalButtons');
          container.innerHTML='<paypal-button type="pay"></paypal-button>';
          container.querySelector('paypal-button').addEventListener('click',async () => {
            if(!validCheckout()) return;
            try {
              const orderPromise=backend('shop-create-order',{
                items:cart.map(i=>({id:i.id,qty:i.qty,size:i.size})),
                language:en?'en':'ru',promoCode:$('#shopPromoCode')?.value||'',delivery:delivery()
              }).then(result=>{lastOrderId=result.orderId;return {orderId:result.paypalOrderId};});
              await paymentSession.start({presentationMode:'auto'},orderPromise);
            } catch(error) {
              notify(t('Не удалось создать заказ: ','Could not create an order: ')+error.message,'#shopCheckoutNotice');
            }
          });
          paypalInitialized=true;
        } catch(error) {
          notify(t('Не удалось инициализировать PayPal SDK: ','Could not initialize PayPal SDK: ')+error.message,'#shopCheckoutNotice');
        }
      };
      script.onerror=()=>notify(t('PayPal SDK не загрузился.','PayPal SDK failed to load.'),'#shopCheckoutNotice');
      document.head.append(script);
    } catch(error) {notify(t('Тестовая оплата пока недоступна: ','Test checkout unavailable: ')+error.message,'#shopCheckoutNotice');}
  }
  async function refreshSession() {
    const result=await cms.client.auth.getSession();
    session=result.data?.session||null;
    $('#shopAuthForm').hidden=Boolean(session);
    $('#shopAccountContent').hidden=!session;
    $('#shopUserEmail').textContent=session?.user?.email||'';
    if(session) {await Promise.all([loadProfile(),loadOrders()]);await initPaypal();}
    else {paypalInitialized=false;$('#shopPaypalButtons').innerHTML='';}
    window.dispatchEvent(new CustomEvent('bazooka:session',{detail:{signedIn:Boolean(session)}}));
  }
  async function authenticate(signUp) {
    const f=$('#shopAuthForm');if(!f.reportValidity()) return;
    const email=$('#shopEmail').value.trim(),password=$('#shopPassword').value;
    const result=signUp?await cms.client.auth.signUp({email,password})
      :await cms.client.auth.signInWithPassword({email,password});
    if(result.error) throw result.error;
    notify(signUp?t('Проверь почту: Supabase может запросить подтверждение регистрации.','Check your email to confirm registration if required.')
      :t('Вход выполнен.','Signed in.'),'#shopAuthNotice');
    await refreshSession();
  }
  function addCartLine(id,size) {
    const item=products.find(p=>p.id===id), st=item?status(item):2;
    if(!item||st===2||usd(item)===null)return;
    if(clothing(item)&&!size){notify(t('Сначала выбери размер.','Choose a size first.'));return;}
    const found=cart.find(i=>i.id===id&&i.size===size);
    if(found){if(found.qty>=10)return;found.qty+=1;}
    else cart.push({id,size,qty:1});
    saveCart();
    notify(t('Товар добавлен в корзину.','Added to cart.'));
  }
  window.BazookaShop={getProducts:()=>products.slice(),getCart:()=>cart.slice(),
    reloadOrders:loadOrders,refreshSession};
  document.addEventListener('click',event=>{
    const thumb=event.target.closest('[data-gallery-src]');
    if(thumb){thumb.closest('article').querySelector('img').src=thumb.dataset.gallerySrc;return;}
    const add=event.target.closest('[data-shop-add]');
    if(add){
      const id=add.dataset.shopAdd,item=products.find(p=>p.id===id);
      if(!item)return;
      const size=$('[data-size-for="'+CSS.escape(id)+'"]')?.value||'';
      if(clothing(item)&&!size){notify(t('Сначала выбери размер.','Choose a size first.'));return;}
      addCartLine(id,size);return;
    }
    const change=event.target.closest('[data-qty]'),remove=event.target.closest('[data-remove-item]');
    if(change||remove){
      const button=change||remove,entry=cart.find(i=>i.id===button.dataset.id&&i.size===button.dataset.size);
      if(!entry)return;
      if(remove)cart=cart.filter(i=>i!==entry);
      else entry.qty=Math.max(0,Math.min(10,entry.qty+Number(button.dataset.qty)));
      cart=cart.filter(i=>i.qty>0);saveCart();
    }
  });
  let demoAttempt=null;
  $('#shopDemoOrder').addEventListener('click',async event=>{
    if(!validCheckout())return;
    const button=event.currentTarget;
    button.disabled=true;
    try {
      const payload={localDemo:true,items:cart,delivery:delivery(),language:en?'en':'ru',promoCode:$('#shopPromoCode').value};
      const signature=JSON.stringify([session.user.id,payload]);
      if(demoAttempt?.signature!==signature)demoAttempt={signature,key:crypto.randomUUID()};
      const result=await backend('shop-create-order',{...payload,requestId:demoAttempt.key});
      demoAttempt=null;
      cart=[];saveCart();await loadOrders();
      notify(t('Тестовый заказ создан.','Test order placed.')+' '+result.orderId,'#shopCheckoutNotice');
    } catch(error){notify(error.message,'#shopCheckoutNotice');}
    finally{button.disabled=false;}
  });
  $('#shopAuthForm').addEventListener('submit',event=>{event.preventDefault();
    authenticate(false).catch(e=>notify(e.message,'#shopAuthNotice'));});
  $('#shopSignup').addEventListener('click',()=>authenticate(true).catch(e=>notify(e.message,'#shopAuthNotice')));
  $('#shopLogout').addEventListener('click',async()=>{
    await cms.client.auth.signOut();await refreshSession();
    notify(t('Вы вышли из аккаунта.','Signed out.'),'#shopAuthNotice');
  });
  $('#shopAddressForm').addEventListener('submit',event=>saveProfile(event).catch(e=>notify(e.message,'#shopCheckoutNotice')));
  async function init() {
    if(!cms?.isReady()) {notify(t('Supabase не настроен.','Supabase not configured.'));return;}
    const {countryCodes: codes}=await import('/assets/js/shop-countries.mjs');
    const regions=new Intl.DisplayNames([en?'en':'ru'],{type:'region'});
    const country=$('[name=country]');
    for(const [code,label] of codes.map(code=>[code,regions.of(code)]).sort((a,b)=>a[1].localeCompare(b[1],en?'en':'ru'))) {
      country.add(new Option(label,code));
    }
    country.value='GE';
    await fetchProducts();await refreshSession();
  }
  init().catch(e=>notify(e.message));
})();
