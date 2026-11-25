(() => {
  "use strict";
  const en=document.documentElement.lang==="en";
  const t=(ru,eng)=>en?eng:ru;
  const $=(s,root=document)=>root.querySelector(s);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const cms=window.BazookaCMS;
  let loggedIn=false,threads=[],currentThread=null,contextProduct=null,contextSubject="",
    preorderTarget=null,orders=[],reviews=[],reviewFilter=null,polling=false;
  const shop=()=>window.BazookaShop;
  const notice=(s,target="#shopMessageNotice")=>{const el=$(target);if(el)el.textContent=s;};
  const uuid=/^[a-zA-Z0-9_-]{1,128}$/;
  const productTitle=item=>en?(item.titleEn||item.titleRu):(item.titleRu||item.titleEn);

  async function api(action,payload,admin=false) {
    const {data,error}=await cms.client.auth.getSession();
    if(error||!data.session?.access_token)throw new Error(t("Сначала войди в кабинет.","Please sign in."));
    const response=await fetch("/.netlify/functions/"+(admin?"shop-admin-action":"shop-customer-action"),{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+data.session.access_token},
      body:JSON.stringify({action,...payload})
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(json.error||"Request failed");
    return json;
  }
  function setLoginReminder(){
    notice(t("Чтобы написать мастеру, войди или зарегистрируйся. Черновик останется здесь.",
      "Sign in or register to message the artist. Your draft will remain."));
    location.hash="#account";
  }
  function beginConversation(item){
    currentThread=null;
    contextProduct=item?.id||null;
    contextSubject=item?t("Вопрос о товаре: ","Question about: ")+productTitle(item):t("Вопрос в магазин","Shop question");
    $("#shopThreadTitle").textContent=contextSubject;
    $("#shopChatMessages").innerHTML='<p class="shopSmall">'+t(
      "Напиши первое сообщение, мы получим уведомление и ответим здесь.","Send your first message. We will be notified and reply here.")+'</p>';
    $("#shopChatInput").value=item?t("Здравствуйте! Хочу уточнить по товару «","Hello! I have a question about “")+productTitle(item)+(en?'”.':'».'):"";
    if(!loggedIn){setLoginReminder();return;}
    notice(t("Новый диалог. Напиши и нажми «Отправить».","New conversation. Write your message and send it."));
    location.hash="#messages";
    $("#shopChatInput").focus();
  }
  async function listThreads() {
    if(!loggedIn)return;
    const {data,error}=await cms.client.from("shop_threads")
      .select("id,subject,product_id,order_id,last_message_at,customer_read_at,staff_read_at")
      .order("last_message_at",{ascending:false}).limit(80);
    if(error)throw error;
    threads=data||[];
    const root=$("#shopThreads");
    root.innerHTML=threads.length?threads.map(thread=>{
      const unread=thread.staff_read_at && (!thread.customer_read_at ||
        Date.parse(thread.staff_read_at)>Date.parse(thread.customer_read_at));
      return `<button class="shopThread ${thread.id===currentThread?"selected":""}"
        data-open-thread="${esc(thread.id)}" type="button">
        <span>${esc(thread.subject)}</span>
        <small>${esc(new Date(thread.last_message_at).toLocaleDateString(en?"en-US":"ru-RU"))}</small>
        ${unread?'<b class="shopUnread">●</b>':""}
      </button>`;
    }).join(""):'<p class="shopSmall">'+t("Переписок пока нет.","No conversations yet.")+"</p>";
    if(currentThread && threads.some(q=>q.id===currentThread))await loadMessages(currentThread,false);
  }
  async function loadMessages(id,mark=true){
    if(!loggedIn)return;
    const thread=threads.find(t=>t.id===id);
    if(!thread)return;
    const {data,error}=await cms.client.from("shop_messages")
      .select("id,thread_id,sender_role,body,created_at")
      .eq("thread_id",id).order("created_at",{ascending:true}).limit(200);
    if(error)throw error;
    $("#shopThreadTitle").textContent=thread.subject;
    const box=$("#shopChatMessages"),atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<85;
    box.innerHTML=(data||[]).map(m=>`<article class="shopBubble ${m.sender_role==="staff"?"staff":"customer"}">
      <div>${esc(m.body)}</div>
      <time>${esc(new Date(m.created_at).toLocaleString(en?"en-US":"ru-RU",{dateStyle:"short",timeStyle:"short"}))}</time>
    </article>`).join("")||'<p class="shopSmall">'+t("Пока нет сообщений.","No messages yet.")+"</p>";
    if(atBottom)box.scrollTop=box.scrollHeight;
    if(mark){await api("mark-read",{threadId:id});await listThreads();}
  }
  async function openThread(id){
    currentThread=id;contextProduct=null;contextSubject="";
    await loadMessages(id,true);
    for(const el of document.querySelectorAll("[data-open-thread]"))
      el.classList.toggle("selected",el.dataset.openThread===id);
    location.hash="#messages";
  }
  async function sendMessage(event){
    event.preventDefault();
    if(!loggedIn){setLoginReminder();return;}
    const input=$("#shopChatInput"),body=input.value.trim();
    if(!body)return;
    const btn=event.submitter||$("#shopChatForm button[type=submit]");btn.disabled=true;
    try {
      if(currentThread)await api("send-message",{threadId:currentThread,body});
      else{
        const result=await api("new-thread",{subject:contextSubject||t("Вопрос в магазин","Shop question"),
          productId:contextProduct,body});
        currentThread=result.threadId;contextProduct=null;contextSubject="";
        if(!result.notified)notice(t("Сообщение сохранено. Уведомления в Telegram пока не настроены либо недоступны.",
          "Message saved. Telegram notification is not configured or unavailable."));
      }
      input.value="";
      await listThreads();
      await openThread(currentThread);
    }catch(error){notice(error.message);}
    finally{btn.disabled=false;}
  }
  function setPreorder(detail){
    preorderTarget=detail;
    const item=shop()?.getProducts().find(p=>p.id===detail.id);
    $("#shopPreorderProduct").textContent=item?productTitle(item):"";
    $("#shopPreorderDialog").showModal();
  }
  function closePreorder(){$("#shopPreorderDialog").close();}
  async function loadPublicReviews(){
    if(!cms?.isReady())return;
    const {data,error}=await cms.client.from("shop_reviews")
      .select("id,product_id,rating,body,photo_path,created_at,moderation")
      .eq("moderation","approved").order("created_at",{ascending:false}).limit(100);
    if(error){console.warn("Review fetch:",error);return;}
    const withPhotos=await Promise.all((data||[]).map(async r=>{
      let signedUrl="";
      if(r.photo_path){
        const {data}=await cms.client.storage.from("shop-review-photos").createSignedUrl(r.photo_path,600);
        signedUrl=data?.signedUrl||"";
      }
      return {...r,signedUrl};
    }));
    reviews=withPhotos;renderReviewSummaries();renderReviews();
  }
  function renderReviewSummaries(){
    shop()?.getProducts().forEach(item=>{
      const root=$('[data-review-summary-for="'+CSS.escape(item.id)+'"]');
      if(!root)return;
      const subset=reviews.filter(x=>x.product_id===item.id);
      if(!subset.length){root.innerHTML="";return;}
      const avg=(subset.reduce((n,r)=>n+r.rating,0)/subset.length).toFixed(1);
      root.innerHTML=`<button data-review-filter="${esc(item.id)}" class="shopSecondary" type="button">
        ★ ${avg} · ${subset.length} ${t("отзывов","reviews")}</button>`;
    });
  }
  function renderReviews(){
    const list=reviewFilter?reviews.filter(r=>r.product_id===reviewFilter):reviews;
    const root=$("#shopPublicReviews");
    if(!root)return;
    let heading=reviewFilter?`<button class="shopSecondary" data-review-filter="all" type="button">${t("Все отзывы","All reviews")}</button>`:"";
    root.innerHTML=heading+(list.length?list.map(r=>{
      const item=shop()?.getProducts().find(p=>p.id===r.product_id);
      return `<article class="shopReviewCard">
        <h3>${esc(item?productTitle(item):t("Покупка","Purchase"))}</h3>
        <div aria-label="${r.rating} of 5 stars" class="shopReviewStars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div>
        <time>${esc(new Date(r.created_at).toLocaleDateString(en?"en-US":"ru-RU"))}</time>
        <p>${esc(r.body||t("Оценка без комментария","Rating without comment"))}</p>
        ${r.signedUrl?`<img src="${esc(r.signedUrl)}" alt="${t("Фото покупателя","Customer photo")}" loading="lazy">`:""}
        <small>${t("Подтверждённая покупка","Verified purchase")}</small>
      </article>`;
    }).join(""):'<p class="shopSmall">'+t("Опубликованных отзывов пока нет.","No published reviews yet.")+"</p>");
  }
  async function loadReviewEligibility(){
    if(!loggedIn)return;
    const {data}=await cms.client.auth.getUser();const userId=data?.user?.id;
    if(!userId)return;
    const {data:own,error}=await cms.client.from("shop_reviews")
      .select("order_id,product_id,user_id").eq("user_id",userId);
    if(error)throw error;
    const existing=new Set((own||[]).map(r=>r.order_id+"|"+r.product_id));
    const select=$("#shopReviewProduct");
    const opts=[];
    orders.filter(o=>o.status==="paid"&&o.fulfillment_status==="delivered").forEach(o=>{
      const unique=new Set();
      (o.items||[]).forEach(i=>{
        if(unique.has(i.id))return;unique.add(i.id);
        if(existing.has(o.id+"|"+i.id))return;
        const item=shop()?.getProducts().find(p=>p.id===i.id);
        const name=item?productTitle(item):i.name||i.id;
        opts.push({value:o.id+"|"+i.id,label:name+" · "+o.id.slice(0,8)});
      });
    });
    select.innerHTML='<option value="">'+t("Выбери товар","Choose a product")+'</option>'+opts.map(x=>
      `<option value="${esc(x.value)}">${esc(x.label)}</option>`).join("");
  }
  async function submitReview(event){
    event.preventDefault();
    const control=$("#shopReviewProduct"),selection=control.value.split("|");
    if(selection.length!==2)return notice(t("Сначала выбери доставленный товар.","Choose a delivered product."),
      "#shopReviewNotice");
    const [orderId,productId]=selection;
    const submit=event.submitter||$("#shopReviewForm button[type=submit]");submit.disabled=true;
    try{
      const rating=Number($("#shopReviewRating").value);
      let photoPath=null;
      const file=$("#shopReviewPhoto").files[0];
      if(file){
        const mime={ "image/jpeg":"jpg","image/png":"png","image/webp":"webp" }[file.type];
        if(!mime||file.size>5*1024*1024)throw new Error(t("Фото должно быть JPG, PNG или WEBP до 5 МБ.",
          "Photo must be JPG, PNG or WEBP, maximum 5 MB."));
        const {data:auth}=await cms.client.auth.getUser();
        if(!auth?.user?.id)throw new Error(t("Требуется вход.","Sign in required."));
        photoPath=auth.user.id+"/"+crypto.randomUUID()+"."+mime;
        const {error}=await cms.client.storage.from("shop-review-photos").upload(photoPath,file,{
          contentType:file.type,upsert:false
        });
        if(error)throw error;
      }
      await api("review",{orderId,productId,rating,
        body:$("#shopReviewBody").value,photoPath});
      $("#shopReviewForm").reset();
      notice(t("Отзыв отправлен на проверку. После одобрения он появится у товара.",
        "Review submitted for moderation. It will appear after approval."),"#shopReviewNotice");
      await loadReviewEligibility();
    }catch(error){notice(error.message,"#shopReviewNotice");}
    finally{submit.disabled=false;}
  }
  function updateReviewOrders(event){
    orders=event.detail?.orders||[];
    if(loggedIn)loadReviewEligibility().catch(e=>notice(e.message,"#shopReviewNotice"));
  }
  async function onSession(event){
    loggedIn=Boolean(event.detail?.signedIn);
    if(!loggedIn){threads=[];currentThread=null;$("#shopThreads").innerHTML="";
      $("#shopChatMessages").innerHTML="";return;}
    try{await listThreads();await loadReviewEligibility();}catch(error){notice(error.message);}
  }
  function bind(){
    $("#shopNewThread").addEventListener("click",()=>beginConversation(null));
    $("#shopChatForm").addEventListener("submit",sendMessage);
    $("#shopReviewForm").addEventListener("submit",submitReview);
    $("#shopAcceptPreorder").addEventListener("click",()=>{
      const item=preorderTarget;closePreorder();
      if(item)shop()?.addPreorder(item.id,item.size);
      preorderTarget=null;
      location.hash="#cart";
    });
    $("#shopContactArtist").addEventListener("click",()=>{
      const item=shop()?.getProducts().find(p=>p.id===preorderTarget?.id);
      closePreorder();preorderTarget=null;
      beginConversation(item);
    });
    $("#shopCancelPreorder").addEventListener("click",()=>{closePreorder();preorderTarget=null;});
    document.addEventListener("click",event=>{
      const contact=event.target.closest("[data-contact-product]");
      if(contact){const item=shop()?.getProducts().find(i=>i.id===contact.dataset.contactProduct);
        if(item)beginConversation(item);return;}
      const thread=event.target.closest("[data-open-thread]");
      if(thread){openThread(thread.dataset.openThread).catch(e=>notice(e.message));return;}
      const filter=event.target.closest("[data-review-filter]");
      if(filter){reviewFilter=filter.dataset.reviewFilter==="all"?null:filter.dataset.reviewFilter;
        renderReviews();location.hash="#publicReviews";}
    });
    window.addEventListener("bazooka:preorder",event=>setPreorder(event.detail));
    window.addEventListener("bazooka:session",event=>onSession(event));
    window.addEventListener("bazooka:orders",updateReviewOrders);
    window.addEventListener("bazooka:products",()=>loadPublicReviews());
    // Light polling, so both parties see replies without a webhook or a deploy.
    setInterval(()=>{
      if(!loggedIn||document.hidden||polling)return;
      polling=true;listThreads().catch(e=>console.warn("Inbox poll",e)).finally(()=>polling=false);
    },9000);
    cms?.client?.auth.getSession().then(({data})=>{
      if(data?.session)onSession({detail:{signedIn:true}});
    });
    loadPublicReviews().catch(e=>console.warn("Review read",e));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
