import {db,fail,money,paypal,reply,settings} from '../lib/shop-server.mjs';
export async function handler(event) {
  if(event.httpMethod!=='POST') return reply(405,{error:'Method not allowed'});
  try {
    settings();
    if(!process.env.PAYPAL_WEBHOOK_ID) return reply(503,{error:'Webhook ID not configured'});
    const headers={};
    for(const [key,value] of Object.entries(event.headers||{})) headers[key.toLowerCase()]=value;
    const required=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
    if(required.some(key=>!headers[key])) return reply(400,{error:'Missing PayPal webhook headers'});
    const payload=JSON.parse(event.body||'{}');
    const validation=await paypal('/v1/notifications/verify-webhook-signature',{body:{
      auth_algo:headers['paypal-auth-algo'],cert_url:headers['paypal-cert-url'],
      transmission_id:headers['paypal-transmission-id'],transmission_sig:headers['paypal-transmission-sig'],
      transmission_time:headers['paypal-transmission-time'],
      webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:payload
    }});
    if(validation.verification_status!=='SUCCESS') return reply(403,{error:'Invalid webhook signature'});
    if(payload.event_type!=='PAYMENT.CAPTURE.COMPLETED') return reply(200,{received:true});
    const resource=payload.resource||{};
    const paypalOrderId=resource.supplementary_data?.related_ids?.order_id;
    if(!paypalOrderId||resource.status!=='COMPLETED') return reply(200,{received:true,ignored:true});
    const orders=await db('shop_orders?'+new URLSearchParams({
      paypal_order_id:'eq.'+paypalOrderId,select:'*'
    }));
    const order=orders?.[0];
    if(!order) return reply(200,{received:true,ignored:true});
    if(order.status==='paid') return reply(200,{received:true,alreadyPaid:true});
    if(order.status!=='pending' || resource.amount?.currency_code!=='USD'
       || resource.amount?.value!==money(order.total_usd_cents))
      return reply(409,{error:'Capture did not match expected order'});
    await db('shop_orders?'+new URLSearchParams({id:'eq.'+order.id,status:'eq.pending'}),{
      method:'PATCH',body:{status:'paid',paypal_capture_id:resource.id,paid_at:new Date().toISOString()}
    });
    return reply(200,{received:true,paid:true});
  } catch(error){return fail(error);}
}
