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
    const subject=(en?'Test order confirmed':'Тестовый заказ подтверждён')+' #'+order.id;
    const lines=order.items.map(i=>i.name+(i.size?' ('+i.size+')':'')+' × '+i.quantity+' - USD '+money(i.quantity*i.unit_usd_cents));
    const address=order.shipping_address;
    const text=[subject,...lines,(en?'Total':'Итого')+' USD '+money(order.total_usd_cents),
      [address.country,address.city,address.postal,address.street].filter(Boolean).join(', '),
      en?'Postage will be quoted separately. No real payment was taken.':'Доставку согласуем отдельно. Реального списания не было.'].join('\n');
    let response;
    if(process.env.SHOP_RECEIPT_TRANSPORT==='resend') {
      if(!process.env.SHOP_RESEND_API_KEY || !process.env.SHOP_RECEIPT_FROM)throw new Error('Missing email sender configuration');
      response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
        Authorization:'Bearer '+process.env.SHOP_RESEND_API_KEY,'Content-Type':'application/json',
        'Idempotency-Key':'shop-receipt/'+order.id
      },body:JSON.stringify({from:process.env.SHOP_RECEIPT_FROM,to:[order.email],subject,text})});
    } else {
      if(!localDemoEnabled())throw new Error('Select an email transport');
      response=await fetch('http://127.0.0.1:54324/api/v1/send',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({From:{Email:'shop@sacra.test'},To:[{Email:order.email}],Subject:subject,Text:text})});
    }
    if(!response.ok)throw new Error('Email provider status '+response.status);
    await db(path,{method:'PATCH',body:{receipt_sent_at:new Date().toISOString()}});
  } catch(error) {
    await db(path+'&receipt_attempt_at=eq.'+encodeURIComponent(attempted),{method:'PATCH',body:{receipt_attempt_at:null}});
    throw error;
  }
}
export async function tryReceipt(id) {
  try { await sendReceipt(id); } catch(error) { console.error('[receipt]',id,error.message); }
}
