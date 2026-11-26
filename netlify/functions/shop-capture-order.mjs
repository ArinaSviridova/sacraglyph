import {tryReceipt} from '../lib/shop-receipt.mjs';
import {telegram} from '../lib/shop-crm-server.mjs';
import {db,fail,money,paypal,reply,requireUser,settings} from '../lib/shop-server.mjs';
export async function handler(event) {
  if(event.httpMethod!=='POST') return reply(405,{error:'Method not allowed'});
  try {
    settings();
    const user=await requireUser(event);
    const {orderId,paypalOrderId}=JSON.parse(event.body||'{}');
    if(!/^[0-9a-f-]{36}$/i.test(String(orderId||''))||!/^[A-Z0-9-]{8,40}$/i.test(String(paypalOrderId||'')))
      return reply(400,{error:'Invalid order identifiers'});
    const orders=await db('shop_orders?'+new URLSearchParams({id:'eq.'+orderId,user_id:'eq.'+user.id,select:'*'}));
    const local=orders?.[0];
    if(!local||local.paypal_order_id!==paypalOrderId) return reply(404,{error:'Order not found'});
    if(local.status==='paid'){await tryReceipt(orderId);return reply(200,{paid:true,orderId});}
    if(local.status!=='pending') return reply(409,{error:'Order cannot be paid'});
    const result=await paypal('/v2/checkout/orders/'+encodeURIComponent(paypalOrderId)+'/capture',{
      requestId:orderId,body:{}
    });
    const captures=result.purchase_units?.flatMap(unit=>unit.payments?.captures||[])||[];
    const valid=result.status==='COMPLETED' && captures.length===1
      && captures[0].status==='COMPLETED'
      && captures[0].amount?.currency_code==='USD'
      && captures[0].amount?.value===money(local.total_usd_cents)
      && result.purchase_units?.[0]?.reference_id===orderId;
    if(!valid) return reply(409,{error:'Payment was not verified. Contact support with the order ID.'});
    const updated=await db('shop_orders?id=eq.'+encodeURIComponent(orderId)+'&status=eq.pending',{method:'PATCH',
      body:{status:'paid',paypal_capture_id:captures[0].id,paid_at:new Date().toISOString()}});
    await tryReceipt(orderId);
    if(updated?.length)await telegram('🛍 Новый оплаченный заказ (Sandbox)\nЗаказ: '+orderId+'\nСумма: '+money(local.total_usd_cents)+' USD\nОткрыть: /shop-admin.html#orders');
    return reply(200,{paid:true,orderId});
  } catch(error){return fail(error);}
}
