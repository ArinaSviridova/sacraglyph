(() => {
  "use strict";
  const cms=window.BazookaCMS;
  const $=selector=>document.querySelector(selector);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const date=v=>v?new Date(v).toLocaleString("ru-RU"):"";
  const money=cents=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD"}).format(cents/100);
  const statusMap={new:"Новый",accepted:"Принят",making:"В изготовлении",packed:"Собран",
    shipped:"В доставке",delivered:"Доставлен",cancelled:"Отменён"};
  let currentThread=null,threads=[],threadMessages=[],lastMessages="",isReady=false,isLoading=false;
  function feedback(id,message){const el=$(id);if(el)el.textContent=message;}
  async function api(action,payload={}) {
    const {data,error}=await cms.client.auth.getSession();
    if(error||!data.session?.access_token)throw new Error("Необходимо войти в админку");
    const r=await fetch("/.netlify/functions/shop-admin-action",{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},
      body:JSON.stringify({action,...payload})
    });
    const json=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(json.error||"Ошибка запроса");
    return json;
  }
  async function loadThreads(){
    if(!isReady)return;
    const {data,error}=await cms.client.from("shop_threads")
      .select("id,subject,user_id,product_id,order_id,last_message_at,customer_read_at,staff_read_at")
      .order("last_message_at",{ascending:false}).limit(100);
    if(error)throw error;
    threads=data||[];
    $("#crmThreadList").innerHTML=threads.length?threads.map(th=>{
      const unread=!th.staff_read_at || (Date.parse(th.last_message_at)>Date.parse(th.staff_read_at));
      return `<button class="crmThread ${currentThread===th.id?"active":""}" type="button" data-crm-thread="${esc(th.id)}">
        <strong>${unread?"● ":""}${esc(th.subject)}</strong>
        <small>${esc(th.id.slice(0,8))} · ${esc(date(th.last_message_at))}</small>
      </button>`;
    }).join(""):"<p>Входящих сообщений пока нет.</p>";
    if(currentThread&&threads.some(th=>th.id===currentThread))await loadThreadMessages(currentThread,false);
  }
  async function loadThreadMessages(id,mark=true){
    const th=threads.find(t=>t.id===id);
    if(!th)return;
    const {data,error}=await cms.client.from("shop_messages")
      .select("id,thread_id,sender_role,body,created_at")
      .eq("thread_id",id).order("created_at",{ascending:true}).limit(200);
    if(error)throw error;
    const items=data||[];
    $("#crmThreadHeading").textContent=th.subject+(th.order_id?" · заказ "+th.order_id.slice(0,8):"");
    const history=$("#crmHistory"),wasBottom=history.scrollHeight-history.clientHeight-history.scrollTop<70;
    const sig=JSON.stringify(items.map(m=>m.id));
    if(sig!==lastMessages){
      history.innerHTML=items.map(m=>`<div class="crmMessage ${m.sender_role==="staff"?"staff":"customer"}">
      ${esc(m.body)}<time>${esc(m.sender_role==="staff"?"Магазин":"Клиент")} · ${esc(date(m.created_at))}</time>
      </div>`).join("")||"<p>Здесь пока нет сообщений.</p>";
      if(wasBottom)history.scrollTop=history.scrollHeight;
      lastMessages=sig;
    }
    if(mark){await api("mark-read",{threadId:id});await loadThreads();}
  }
  async function openThread(id){
    currentThread=id;lastMessages="";
    await loadThreadMessages(id,true);
    document.querySelectorAll("[data-crm-thread]").forEach(el=>
      el.classList.toggle("active",el.dataset.crmThread===id));
  }
  async function sendReply(event){
    event.preventDefault();
    if(!currentThread){feedback("#crmMessageStatus","Сначала выберите диалог");return;}
    const area=$("#crmReplyBody"),body=area.value.trim();
    if(!body)return;
    const button=event.submitter||$("#crmReplyForm button[type=submit]");
    button.disabled=true;
    try{
      await api("reply",{threadId:currentThread,body});area.value="";
      await loadThreads();
      await loadThreadMessages(currentThread,false);
      feedback("#crmMessageStatus","Ответ отправлен клиенту в кабинет.");
    }catch(error){feedback("#crmMessageStatus",error.message);}
    finally{button.disabled=false;}
  }
  async function loadOrders(){
    const {data,error}=await cms.client.from("shop_orders")
      .select("id,user_id,email,status,fulfillment_status,tracking_number,items,total_usd_cents,discount_usd_cents,promo_code,created_at,paid_at")
      .order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    $("#crmOrderList").innerHTML=(data||[]).length?(data||[]).map(o=>`
      <article class="crmAdminCard" data-crm-order="${esc(o.id)}">
        <h3>Заказ ${esc(o.id.slice(0,8))} · ${esc(date(o.created_at))}</h3>
        <p>${esc(o.email)} · ${money(o.total_usd_cents)} · ${esc(o.status==="paid"?"✅ Оплачен":"Оплата: "+o.status)}</p>
        ${o.promo_code?`<p>Промокод: ${esc(o.promo_code)} · Скидка ${money(o.discount_usd_cents||0)}</p>`:""}
        <p>${(o.items||[]).map(i=>esc(i.name||i.id)+" × "+Number(i.quantity||0)
          +(i.size?" ("+esc(i.size)+")":"")+(i.preorder?" · ПРЕДЗАКАЗ":"")).join("<br>")}</p>
        <div class="crmControls">
          <label>Статус <select data-fulfillment>
            ${Object.entries(statusMap).map(([v,label])=>
              `<option value="${v}" ${o.fulfillment_status===v?"selected":""}>${label}</option>`).join("")}
          </select></label>
          <label>Трек-номер <input data-tracking maxlength="120" value="${esc(o.tracking_number||"")}" placeholder="Для клиента"></label>
          <button class="adminButton primary" data-save-order type="button">Сохранить статус</button>
          <button class="adminButton" data-message-order="${esc(o.id)}" type="button">Диалоги по заказу</button>
        </div>
        <details class="crmOrderCompose">
          <summary>Написать клиенту первым</summary>
          <textarea class="adminTextarea" data-order-first-message rows="2" maxlength="2000"
            placeholder="Здравствуйте! Пишем по вашему заказу..." aria-label="Первое сообщение клиенту"></textarea>
          <button class="adminButton" type="button" data-start-order-thread="${esc(o.id)}">Начать переписку</button>
        </details>
        <small>Перед статусом «Доставлен» проверьте фактическое вручение. После него открываются отзывы.</small>
      </article>
    `).join(""):"<p>Заказов пока нет.</p>";
  }
  async function updateOrder(button){
    const wrap=button.closest("[data-crm-order]");
    const orderId=wrap.dataset.crmOrder,status=wrap.querySelector("[data-fulfillment]").value;
    const trackingNumber=wrap.querySelector("[data-tracking]").value;
    button.disabled=true;
    try{
      await api("order-status",{orderId,status,trackingNumber});
      feedback("#crmOrderStatus","Статус заказа обновлён.");
      await loadOrders();
    }catch(error){feedback("#crmOrderStatus",error.message);}
    finally{button.disabled=false;}
  }
  async function loadCoupons(){
    const {data,error}=await cms.client.from("shop_coupons")
      .select("code,discount_type,discount_value,minimum_usd_cents,max_uses,active,expires_at")
      .order("created_at",{ascending:false}).limit(150);
    if(error)throw error;
    $("#crmCouponList").innerHTML=(data||[]).map(c=>`<div class="crmAdminCard">
      <b>${esc(c.code)}</b> · ${c.discount_type==="percent"?c.discount_value+"%":money(c.discount_value)}
      · ${c.active?"Активен":"Выключен"}${c.expires_at?" · до "+esc(date(c.expires_at)):""}
      <button class="adminButton" type="button" data-edit-coupon="${esc(c.code)}">Редактировать</button>
    </div>`).join("")||"<p>Промокодов пока нет.</p>";
    window.__testCoupons=data||[];
  }
  async function saveCoupon(event){
    event.preventDefault();
    const button=event.submitter||$("#crmCouponForm button[type=submit]");
    button.disabled=true;
    try{
      const type=$("#crmCouponType").value,value=Number($("#crmCouponValue").value);
      if(type==="percent"&&!Number.isInteger(value))throw new Error("Процент должен быть целым числом");
      const payload={
        code:$("#crmCouponCode").value,type,
        value:type==="fixed"?Math.round(value*100):value,
        minimumUsdCents:Math.round(Number($("#crmCouponMin").value||0)*100),
        maxUses:$("#crmCouponLimit").value||null,
        active:$("#crmCouponActive").value==="true",
        expiresAt:$("#crmCouponExpiry").value?new Date($("#crmCouponExpiry").value).toISOString():null
      };
      await api("coupon",payload);
      feedback("#crmCouponStatus","Промокод сохранён в тестовом магазине.");
      await loadCoupons();
    }catch(error){feedback("#crmCouponStatus",error.message);}
    finally{button.disabled=false;}
  }
  async function loadReviews(){
    const {data,error}=await cms.client.from("shop_reviews")
      .select("id,user_id,order_id,product_id,rating,body,photo_path,moderation,created_at")
      .order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    const reviews=await Promise.all((data||[]).map(async r=>{
      let url="";
      if(r.photo_path){
        const {data:signed}=await cms.client.storage.from("shop-review-photos").createSignedUrl(r.photo_path,600);
        url=signed?.signedUrl||"";
      }
      return {...r,imageUrl:url};
    }));
    $("#crmReviewList").innerHTML=reviews.map(r=>`<article class="crmAdminCard">
      <h3>Товар ${esc(r.product_id)} · ${esc("★".repeat(r.rating))}</h3>
      <p>${esc(r.body||"Без текста")}</p>
      <p>Заказ: ${esc(r.order_id.slice(0,8))} · ${esc(date(r.created_at))}</p>
      ${r.imageUrl?`<img class="crmReviewPhoto" src="${esc(r.imageUrl)}" alt="Фото клиента" loading="lazy">`:""}
      <p>Модерация: ${esc(r.moderation)}</p>
      <div class="crmControls">
        <button class="adminButton primary" data-moderate="${esc(r.id)}" data-moderate-status="approved" type="button">Одобрить</button>
        <button class="adminButton" data-moderate="${esc(r.id)}" data-moderate-status="rejected" type="button">Отклонить</button>
      </div>
    </article>`).join("")||"<p>Отзывов пока нет.</p>";
  }
  async function moderate(button){
    button.disabled=true;
    try{
      await api("moderate-review",{reviewId:button.dataset.moderate,moderation:button.dataset.moderateStatus});
      feedback("#crmReviewStatus","Модерация сохранена.");
      await loadReviews();
    }catch(error){feedback("#crmReviewStatus",error.message);}
    finally{button.disabled=false;}
  }
  async function authorized(){
    if(!cms?.isReady()||!(await cms.isAdmin()))return;
    isReady=true;
    await Promise.allSettled([loadThreads(),loadOrders(),loadCoupons(),loadReviews()]);
    if(location.hash==="#messages")document.querySelector('[data-admin-tab="messages"]')?.click();
  }
  function wire(){
    window.addEventListener("bazooka:admin-ready",()=>authorized());
    document.addEventListener("click",event=>{
      const thread=event.target.closest("[data-crm-thread]");
      if(thread)openThread(thread.dataset.crmThread).catch(e=>feedback("#crmMessageStatus",e.message));
      const save=event.target.closest("[data-save-order]");
      if(save)updateOrder(save);
      const first=event.target.closest("[data-start-order-thread]");
      if(first){
        const wrap=first.closest("[data-crm-order]"),body=wrap?.querySelector("[data-order-first-message]")?.value.trim();
        if(!body){feedback("#crmOrderStatus","Напишите первое сообщение.");return;}
        first.disabled=true;
        api("new-order-thread",{orderId:first.dataset.startOrderThread,body}).then(async result=>{
          await loadThreads();
          document.querySelector('[data-admin-tab="messages"]')?.click();
          await openThread(result.threadId);
          feedback("#crmMessageStatus","Новый диалог создан. Покупатель увидит сообщение в кабинете.");
        }).catch(e=>feedback("#crmOrderStatus",e.message)).finally(()=>{first.disabled=false;});
        return;
      }
      const msg=event.target.closest("[data-message-order]");
      if(msg){
        document.querySelector('[data-admin-tab="messages"]')?.click();
        const th=threads.find(t=>t.order_id===msg.dataset.messageOrder);
        if(th)openThread(th.id).catch(e=>feedback("#crmMessageStatus",e.message));
        else feedback("#crmMessageStatus","Для этого заказа ещё нет переписки.");
      }
      const rev=event.target.closest("[data-moderate]");
      if(rev)moderate(rev);
      const coupon=event.target.closest("[data-edit-coupon]");
      if(coupon){
        const c=(window.__testCoupons||[]).find(r=>r.code===coupon.dataset.editCoupon);
        if(!c)return;
        $("#crmCouponCode").value=c.code;$("#crmCouponType").value=c.discount_type;
        $("#crmCouponValue").value=c.discount_type==="percent"?c.discount_value:c.discount_value/100;
        $("#crmCouponMin").value=c.minimum_usd_cents/100;$("#crmCouponLimit").value=c.max_uses||"";
        $("#crmCouponActive").value=String(c.active);
        $("#crmCouponExpiry").value=c.expires_at?new Date(c.expires_at).toISOString().slice(0,16):"";
        $("#crmCouponForm").scrollIntoView({behavior:"smooth"});
      }
    });
    $("#crmReplyForm").addEventListener("submit",sendReply);
    $("#crmCouponForm").addEventListener("submit",saveCoupon);
    $("#crmRefreshMessages").addEventListener("click",()=>loadThreads().catch(e=>feedback("#crmMessageStatus",e.message)));
    $("#crmRefreshOrders").addEventListener("click",()=>loadOrders().catch(e=>feedback("#crmOrderStatus",e.message)));
    $("#crmRefreshReviews").addEventListener("click",()=>loadReviews().catch(e=>feedback("#crmReviewStatus",e.message)));
    $("#crmTestTelegram").addEventListener("click",async event=>{
      const btn=event.currentTarget;btn.disabled=true;
      try{const r=await api("test-telegram");
        feedback("#crmMessageStatus",r.delivered?"✅ Тестовое сообщение отправлено боту":
          r.configured?"Telegram не принял сообщение. Проверьте токен и chat_id.":"Telegram не настроен: добавьте переменные в .env");
      }catch(error){feedback("#crmMessageStatus",error.message);}
      finally{btn.disabled=false;}
    });
    document.querySelectorAll('[data-admin-tab="messages"],[data-admin-tab="orders"],[data-admin-tab="coupons"],[data-admin-tab="reviews"]')
      .forEach(tab=>tab.addEventListener("click",()=>{
        if(!isReady)return;
        const task={messages:loadThreads,orders:loadOrders,coupons:loadCoupons,reviews:loadReviews}[tab.dataset.adminTab];
        task?.().catch(e=>console.warn("Shop CRM refresh",e));
      }));
    setInterval(()=>{
      const active=document.querySelector('[data-admin-panel="messages"].active');
      if(isReady&&!document.hidden&&active&&!isLoading){
        isLoading=true;loadThreads().catch(e=>console.warn("Inbox poll",e)).finally(()=>isLoading=false);
      }
    },8000);
    authorized().catch(e=>console.warn("Test admin CRM init",e));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});
  else wire();
})();
