import {db, config} from './shop-crm-server.mjs';
import {money} from './shop-server.mjs';

export function localDemoEnabled() {
  if(process.env.SHOP_REQUIRE_LOCAL_DB!=='1')return false;
  try { return new URL(config().url).protocol==='http:'; } catch { return false; }
}

export async function sendReceipt(orderId) {
  const attempted=new Date().toISOString();
  const stale=new Date(Date.now()-300000).toISOString();
  const path='shop_orders?id=eq.'+encodeURIComponent(orderId);
  const claim=await db(path+'&status=eq.paid&receipt_sent_at=is.null&or=(receipt_attempt_at.is.null,receipt_attempt_at.lt.'+stale+')',{
    method:'PATCH',body:{receipt_attempt_at:attempted}
  });
  const order=claim?.[0];
  if(!order)return;
  try {
    const en=order.checkout_language==='en';
    const subject=(en?'Test order confirmed':'Тестовый заказ подтверждён')+' #'+order.order_number;
    const lines=order.items.map(i=>i.name+(i.size?' ('+i.size+')':'')+' × '+i.quantity+' - USD '+money(i.quantity*i.unit_usd_cents));
    const address=order.shipping_address;
    const text=[subject,...lines,(en?'Total':'Итого')+' USD '+money(order.total_usd_cents),
      [address.country,address.city,address.postal,address.street].filter(Boolean).join(', '),
      en?'Postage will be quoted separately. No real payment was taken.':'Доставку согласуем отдельно. Реального списания не было.'].join('\n');
    await deliver(order.email,subject,text,'shop-receipt/'+order.id);
    await db(path,{method:'PATCH',body:{receipt_sent_at:new Date().toISOString()}});
  } catch(error) {
    await db(path+'&receipt_attempt_at=eq.'+encodeURIComponent(attempted),{method:'PATCH',body:{receipt_attempt_at:null}});
    throw error;
  }
}
export async function tryReceipt(id) {
  try { await sendReceipt(id); } catch(error) { console.error('[receipt]',id,error.message); }
}

async function deliver(email,subject,text,key){
    let response;
    if(process.env.SHOP_RECEIPT_TRANSPORT==='resend') {
      if(!process.env.SHOP_RESEND_API_KEY || !process.env.SHOP_RECEIPT_FROM)throw new Error('Missing email sender configuration');
      response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
        Authorization:'Bearer '+process.env.SHOP_RESEND_API_KEY,'Content-Type':'application/json',
        'Idempotency-Key':key
      },body:JSON.stringify({from:process.env.SHOP_RECEIPT_FROM,to:[email],subject,text})});
    } else {
      if(!localDemoEnabled())throw new Error('Select an email transport');
      response=await fetch('http://127.0.0.1:54324/api/v1/send',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({From:{Email:'shop@sacra.test'},To:[{Email:email}],Subject:subject,Text:text})});
    }
    if(!response.ok)throw new Error('Email provider status '+response.status);
}

export async function sendStatusUpdates(order){
  const path='shop_status_mail?order_id=eq.'+order.id+'&sent_at=is.null';
  const pending=await db(path+'&select=id&order=created_at');
  for(const entry of pending||[]){
    const expired=new Date(Date.now()-300000).toISOString();
    const target=path+'&id=eq.'+entry.id;
    const [event]=await db(target+'&or=(claimed_at.is.null,claimed_at.lt.'+expired+')',{method:'PATCH',body:{claimed_at:new Date().toISOString()}});
    if(!event)continue;
    try{
      const en=order.checkout_language==='en';
      const states={new:['Новый','New'],accepted:['Принят','Accepted'],making:['В изготовлении','In production'],packed:['Собран','Packed'],shipped:['В доставке','Shipped'],delivered:['Доставлен','Delivered'],cancelled:['Отменён','Cancelled']};
      const subject=(en?'Order #':'Заказ №')+order.order_number+' · '+states[event.state][en?1:0];
      await deliver(order.email,subject,[subject,...order.items.map(i=>i.name+' × '+i.quantity),event.tracking].filter(Boolean).join('\n'),'shop-status/'+event.id);
      await db(target,{method:'PATCH',body:{sent_at:new Date().toISOString()}});
    }catch(error){await db(target,{method:'PATCH',body:{claimed_at:null}});throw error;}
  }
}
