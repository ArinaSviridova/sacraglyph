(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const t = (ru, eng) => en ? eng : ru;
  const $ = (selector, root = document) => root.querySelector(selector);
  const cms = window.BazookaCMS;
  if(location.pathname.endsWith('/merch.html')){
    const legacy=location.hash.slice(1);
    if(['cart','account','messages','shopOrders','shopReviewFormSection'].includes(legacy)){
      location.replace((legacy==='cart'?'cart.html':'account.html')+location.search+'#'+legacy);return;
    }
  }
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
  function saveCart() {localStorage.setItem(store, JSON.stringify(cart));renderCart();window.dispatchEvent(new Event('shop:cart'));}
  function status(item) {
    const st = item.stockStatus || (item.inStock === false ? 'out' : 'in');
    return st==='in' && item.inStock!==false && Object.values(inventory(item)).some(n=>n>0)?0:2;
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
  function inventory(item){return item?.sizeStock??{'':1};}
  function available(item,size){
    if(!item||status(item)!==0)return 0;
    const count=inventory(item)[size];
    return Number.isInteger(count)?count:0;
  }
  function renderProducts(collections) {
    const root=$('#merchCollections');
    if(!root) return;
    if(!products.length) {root.innerHTML='<p>'+t('Опубликованных товаров пока нет.','No published products yet.')+'</p>';return;}
    root.innerHTML=collections.filter(c=>c.items?.length).map(collection=>`
      <section class="merchCollection" id="collection-${esc(collection.id)}">
        <div class="merchCollectionHead">
          <h2 class="merchCollectionTitle">${esc(en?collection.titleEn||collection.titleRu:collection.titleRu||collection.titleEn)}</h2>
          <p class="merchCollectionText">${esc(en?collection.textEn:collection.textRu)}</p>
        </div>
        <div class="merchRow" data-merch-row>${collection.items.filter(i=>i?.id).slice().sort((a,b)=>status(a)-status(b)).map(productCard).join('')}</div>
      </section>`).join('');
  }
  function productCard(item) {
      const st=status(item), price=usd(item), sizes=Object.entries(inventory(item)).filter(([,qty])=>qty>0);
      const disabled=st===2||price===null||price<=0;
      return `<article class="merchItem"><div class="merchCard">
        <div class="merchMedia">${image(item)?`<img class="merchCardImg" src="${esc(image(item))}" alt="${esc(title(item))}" loading="lazy">`:''}</div>
        ${(item.images||[]).length>1?`<div class="shopThumbs">${item.images.map((im,i)=>`<button type="button" data-gallery-src="${esc(url(im.url||im.jpg))}" aria-label="${t('Фото','Photo')} ${i+1}"><img src="${esc(url(im.url||im.jpg))}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
        <div class="merchBody">
          <h3 class="merchTitle">${esc(title(item))}</h3>
          <p class="shopStatus">${st===0?t('В наличии','In stock'):t('Нет в наличии','Out of stock')}</p>
          <p class="merchMeta merchMetaVisible">${price?cash(price):t('Цена USD пока не указана','USD price not set')}</p>
          <div class="shopProductControl">
            ${st===0&&sizes.length?`<label>${t('Размер','Size')} <select data-size-for="${esc(item.id)}">${sizes.map(([size,count])=>`<option value="${esc(size)}">${esc(size||t('Один размер','One size'))} · ${count} ${t('шт.','pcs')}</option>`).join('')}</select></label>`:''}
            <button data-shop-add="${esc(item.id)}" ${disabled?'disabled':''} type="button">${t('В корзину','Add to cart')}</button>
            <button class="shopSecondary" data-contact-product="${esc(item.id)}" type="button">${t('Написать мастеру','Message artist')}</button>
          </div>
          ${(item.descriptionRu || item.descriptionEn)?`<details><summary>${t('Описание','Description')}</summary><p>${esc(en?item.descriptionEn||item.descriptionRu:item.descriptionRu||item.descriptionEn)}</p></details>`:''}
          <div class="shopProductReviewSummary" data-review-summary-for="${esc(item.id)}"></div>
        </div>
      </div></article>`;
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
          <button data-qty="1" ${entry.qty>=Math.min(10,available(item,entry.size))?"disabled":""} data-id="${esc(entry.id)}" data-size="${esc(entry.size)}" type="button" aria-label="Add one">+</button>
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
      const previous=JSON.stringify(cart);
      cart=cart.map(line=>({...line,qty:Math.min(line.qty,available(products.find(item=>item.id===line.id),line.size))})).filter(line=>line.qty>0);
      if(previous!==JSON.stringify(cart))notify(t('Корзина обновлена по текущим остаткам.','Cart updated to available stock.'),$('#shopCheckoutNotice')?'#shopCheckoutNotice':'#shopNotice');
      renderProducts(content?.merchCollections||[]);saveCart();
      window.dispatchEvent(new CustomEvent('bazooka:products',{detail:{products}}));
    } catch(error) {notify(t('Не удалось загрузить товары: ','Could not load products: ')+error.message);}
  }

  function delivery() {
    const f=$('#shopAddressForm');
    const get = name => String(f.elements.namedItem(name)?.value||'').trim();
    return { email:get('email'),name:get('name'),phone:get('phone'),city:get('city'),street:get('street'),
      postal:get('postal'),country:get('country')};
  }
  function validCheckout() {

    if(!cart.length) {notify(t('Корзина пуста.','Cart is empty.'),'#shopCheckoutNotice');return false;}
    if(!$('#shopAddressForm').reportValidity()) return false;
    if(!$('#shopAcceptTerms').checked) {notify(t('Подтверди тестовую покупку.','Confirm the test checkout.'),'#shopCheckoutNotice');return false;}
    return true;
  }
  async function backend(name, body) {
    const {data,error}=await cms.client.auth.getSession();
    if(error)throw error;
    const token=data.session?.access_token;
    if(!token){
      let key=sessionStorage.getItem('shopGuestKey');
      if(!key){key=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('shopGuestKey',key);}
      body={...body,guestKey:key};
    }
    const response=await fetch('/.netlify/functions/'+name,{
      method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok){if(response.status===409)await fetchProducts();throw new Error(result.error||'Checkout error');}
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
      name:data.display_name||session?.user?.user_metadata?.full_name||'',phone:data.phone||'',city:data.address?.city||'',
      street:data.address?.street||'',postal:data.address?.postal||'',country:data.address?.country||'GE'
    })) {const field=f.elements.namedItem(key);if(field) field.value=value;}
  }
  async function loadOrders() {
    const target=$('#shopOrders');
    if(!session||!target)return;
    const {data,error}=await window.shopHistory(()=>cms.client.from('shop_orders')
      .select('id,order_number,shipping_address,email,status,currency,total_usd_cents,items,created_at,fulfillment_status,tracking_number,promo_code,discount_usd_cents')
      .eq('user_id',session.user.id).order('created_at',{ascending:false}).order('id'));
    if(error) {target.textContent=error.message;return;}
    const deliveryLabels={
      new:t('Новый','New'),accepted:t('Принят','Accepted'),making:t('В изготовлении','In production'),
      packed:t('Собран','Packed'),shipped:t('В доставке','Shipped'),
      delivered:t('Доставлен','Delivered'),cancelled:t('Отменён','Cancelled')
    };
    const paymentLabels={pending:t('Ожидает оплаты','Payment pending'),paid:t('Оплачено','Paid'),
      cancelled:t('Отменено','Cancelled'),refunded:t('Возврат','Refunded')};
    const expanded=new Set([...target.querySelectorAll('details[open]')].map(el=>el.dataset.order));
    target.innerHTML=(data||[]).length?(data||[]).map(o=>`<div class="shopOrder">
      <details data-order="${esc(o.id)}" ${expanded.has(o.id)?'open':''}><summary><strong>№${esc(o.order_number)} · ${esc(o.items.map(i=>i.name).join(', '))}</strong> · ${esc(new Date(o.created_at).toLocaleDateString(en?'en-US':'ru-RU'))}
      </summary>
      <p>${o.items.map(i=>esc(i.name)+(i.size?" · "+esc(i.size):"")+" × "+Number(i.quantity)+" · "+cash(i.quantity*i.unit_usd_cents/100)).join("<br>")}</p>
      <p>${esc([o.email,...Object.values(o.shipping_address||{})].filter(Boolean).join(", "))}</p>
      <div class="shopLineMeta">${esc(paymentLabels[o.status]||o.status)} · ${cash(o.total_usd_cents/100)} · ${Array.isArray(o.items)?o.items.length:0} ${t('позиций','items')}</div>
      <div class="shopLineMeta">${t('Доставка: ','Delivery: ')}${esc(deliveryLabels[o.fulfillment_status]||deliveryLabels.new)} ${o.tracking_number?'· '+t('трек: ','tracking: ')+esc(o.tracking_number):''}</div>
      <button class="shopSecondary" data-contact-order="${esc(o.id)}" type="button">${t('Написать по заказу','Ask about this order')}</button>
    </details></div>`).join(''):t('Заказов пока нет.','No orders yet.');
    window.dispatchEvent(new CustomEvent('bazooka:orders',{detail:{orders:data||[]}}));
  }
  async function initPaypal() {
    if(paypalInitialized||!$('#shopPaypalButtons')) return;
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
              notify(t('Заказ №','Order #')+captured.orderNumber,'#shopCheckoutNotice');
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
    for(const el of document.querySelectorAll('#shopAuthForm,[data-auth-options],#guestInvite'))el.hidden=Boolean(session);
    for(const el of document.querySelectorAll('#shopAccountContent,.shopAccountTop,#saveProfile'))el.hidden=!session;
    const fullName=session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||'';
    if($('#shopProfileName'))$('#shopProfileName').value=fullName;
    if($('#shopUserEmail'))$('#shopUserEmail').textContent=[fullName,session?.user?.email].filter(Boolean).join(' · ');
    if(fullName && $('[name=name]') && !$('[name=name]').value)$('[name=name]').value=fullName;
    const email=$('[name=email]');
    if(email && session && !email.value)email.value=session.user.email||'';
    if(session && $('#shopAddressForm'))await loadProfile();
    if(session)await loadOrders();
    await initPaypal();
    window.dispatchEvent(new CustomEvent('bazooka:session',{detail:{signedIn:Boolean(session)}}));
  }
  async function authenticate(signUp) {
    const f=$('#shopAuthForm'),field=$('#shopFullName');
    field.required=signUp;
    if(signUp)field.value=field.value.trim();
    if(!f.reportValidity())return;
    const email=$('#shopEmail').value.trim(),password=$('#shopPassword').value;
    const result=signUp?await cms.client.auth.signUp({email,password,options:{data:{full_name:field.value},emailRedirectTo:location.origin+location.pathname}})
      :await cms.client.auth.signInWithPassword({email,password});
    if(result.error) throw result.error;
    notify(signUp?t('Проверь почту: Supabase может запросить подтверждение регистрации.','Check your email to confirm registration if required.')
      :t('Вход выполнен.','Signed in.'),'#shopAuthNotice');
    await refreshSession();
  }
  function addCartLine(id,size) {
    const item=products.find(p=>p.id===id), st=item?status(item):2;
    if(!item||st===2||usd(item)===null)return;

    const found=cart.find(i=>i.id===id&&i.size===size);
    if((found?.qty||0)>=Math.min(10,available(item,size))){notify(t('Весь доступный остаток уже в корзине.','All available units are in your cart.'));return;}
    if(found){found.qty+=1;}
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

      addCartLine(id,size);return;
    }
    const change=event.target.closest('[data-qty]'),remove=event.target.closest('[data-remove-item]');
    if(change||remove){
      const button=change||remove,entry=cart.find(i=>i.id===button.dataset.id&&i.size===button.dataset.size);
      if(!entry)return;
      if(remove)cart=cart.filter(i=>i!==entry);
      else entry.qty=Math.max(0,Math.min(10,available(products.find(p=>p.id===entry.id),entry.size),entry.qty+Number(button.dataset.qty)));
      cart=cart.filter(i=>i.qty>0);saveCart();
    }
  });
  document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',async()=>{
    try{
      const {error}=await cms.client.auth.signInWithOAuth({provider:button.dataset.provider,options:{redirectTo:location.origin+location.pathname}});
      if(error)throw error;
    }catch(error){notify(error.message,'#shopAuthNotice');}
  }));
  window.addEventListener('storage',event=>{
    if(event.key===store){try{cart=JSON.parse(event.newValue||'[]');renderCart();}catch{}}
  });
  $('#shopNameForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const name=$('#shopProfileName').value.trim();
    if(!name)return;
    const {error}=await cms.client.auth.updateUser({data:{full_name:name}});
    notify(error?error.message:t('Имя сохранено.','Name saved.'),'#shopAuthNotice');
    if(!error)await refreshSession();
  });
  let demoAttempt=null;
  $('#shopDemoOrder')?.addEventListener('click',async event=>{
    if(!validCheckout())return;
    const button=event.currentTarget;
    button.disabled=true;
    try {
      const payload={localDemo:true,items:cart,delivery:delivery(),language:en?'en':'ru',promoCode:$('#shopPromoCode').value};
      const signature=JSON.stringify([session?.user.id||"guest",payload]);
      if(demoAttempt?.signature!==signature)demoAttempt={signature,key:crypto.randomUUID()};
      const result=await backend('shop-create-order',{...payload,requestId:demoAttempt.key});
      demoAttempt=null;
      cart=[];saveCart();await loadOrders();
      notify(t('Тестовый заказ создан.','Test order placed.')+' №'+result.orderNumber,'#shopCheckoutNotice');
    } catch(error){notify(error.message,'#shopCheckoutNotice');}
    finally{button.disabled=false;}
  });
  $('#shopAuthForm button[type=submit]')?.addEventListener('click',()=>{$('#shopFullName').required=false;});
  $('#shopAuthForm')?.addEventListener('submit',event=>{event.preventDefault();
    authenticate(false).catch(e=>notify(e.message,'#shopAuthNotice'));});
  $('#shopSignup')?.addEventListener('click',()=>authenticate(true).catch(e=>notify(e.message,'#shopAuthNotice')));
  $('#shopLogout')?.addEventListener('click',async()=>{
    await cms.client.auth.signOut();
    $('#shopAddressForm')?.reset();
    await refreshSession();
    notify(t('Вы вышли из аккаунта.','Signed out.'),'#shopAuthNotice');
  });
  $('#shopAddressForm')?.addEventListener('submit',event=>saveProfile(event).catch(e=>notify(e.message,'#shopCheckoutNotice')));
  async function init() {
    if(!cms?.isReady()) {notify(t('Supabase не настроен.','Supabase not configured.'),$('#shopAuthNotice')?'#shopAuthNotice':'#shopNotice');return;}
    if($('[name=country]')){
    const {countryCodes: codes}=await import('/assets/js/shop-countries.mjs');
    const regions=new Intl.DisplayNames([en?'en':'ru'],{type:'region'});
    const country=$('[name=country]');
    for(const [code,label] of codes.map(code=>[code,regions.of(code)]).sort((a,b)=>a[1].localeCompare(b[1],en?'en':'ru'))) {
      country.add(new Option(label,code));
    }
    country.value='GE';
    }
    if(!$('#shopOrders'))await fetchProducts();
    await refreshSession();
  }
  init().catch(e=>notify(e.message));
})();
