import {sendReceipt} from '../lib/shop-receipt.mjs';
import {cleaned,config,db,fail,now,problem,requireAdmin,respond,telegram,userFrom,uuid} from '../lib/shop-crm-server.mjs';
const allowed=['new','accepted','making','packed','shipped','delivered','cancelled'];
export async function handler(event){
  if(event.httpMethod!=='POST')return respond(405,{error:'Method not allowed'});
  try{
    config();
    const user=await userFrom(event);
    await requireAdmin(user);
    const input=JSON.parse(event.body||'{}');
    if(input.action==='retry-receipt'){
      await sendReceipt(uuid(input.orderId));
      return respond(200,{ok:true});
    }
    if(input.action==='test-telegram'){
      const result=await telegram('🧪 Тестовое уведомление Bazookatattoo CRM\nИсточник: локальный Netlify Dev\nНикаких реальных заказов.');
      return respond(200,result);
    }
    if(input.action==='new-order-thread'){
      const orderId=uuid(input.orderId),body=cleaned(input.body);
      const orders=await db('shop_orders?'+new URLSearchParams({select:'id,user_id',id:'eq.'+orderId}));
      const order=orders?.[0];
      if(!order)throw problem(404,'Order not found');
      const subject=String(input.subject||'Вопрос по заказу '+orderId.slice(0,8)).trim().slice(0,160);
      if(!subject)throw problem(400,'Subject required');
      const rows=await db('shop_threads',{method:'POST',body:{
        user_id:order.user_id,order_id:orderId,subject,
        last_message_at:now(),staff_read_at:now()
      }});
      const threadId=rows?.[0]?.id;
      if(!threadId)throw new Error('Thread creation failed');
      await db('shop_messages',{method:'POST',body:{
        thread_id:threadId,sender_role:'staff',sender_user_id:user.id,body
      }});
      return respond(200,{threadId});
    }
    if(input.action==='reply'){
      const threadId=uuid(input.threadId),body=cleaned(input.body);
      const found=await db('shop_threads?'+new URLSearchParams({select:'id',id:'eq.'+threadId}));
      if(!found?.length)throw problem(404,'Conversation not found');
      const rows=await db('shop_messages',{method:'POST',body:{
        thread_id:threadId,sender_role:'staff',sender_user_id:user.id,body
      }});
      await db('shop_threads?'+new URLSearchParams({id:'eq.'+threadId}),{
        method:'PATCH',body:{last_message_at:now(),staff_read_at:now()}
      });
      return respond(200,{message:rows?.[0]});
    }
    if(input.action==='mark-read'){
      const threadId=uuid(input.threadId);
      await db('shop_threads?'+new URLSearchParams({id:'eq.'+threadId}),{
        method:'PATCH',body:{staff_read_at:now()}
      });
      return respond(200,{ok:true});
    }
    if(input.action==='order-status'){
      const id=uuid(input.orderId),state=String(input.status||'');
      if(!allowed.includes(state))throw problem(400,'Unsupported order status');
      const rows=await db('shop_orders?'+new URLSearchParams({select:'id,status,fulfillment_status',id:'eq.'+id}));
      const old=rows?.[0];
      if(!old)throw problem(404,'Order not found');
      if(state!=='new' && state!=='cancelled' && old.status!=='paid')
        throw problem(409,'Payment is not confirmed');
      if(old.fulfillment_status==='delivered' && state!=='delivered')
        throw problem(409,'Delivered orders cannot be reverted in this demo');
      if(old.fulfillment_status==='cancelled' && state!=='cancelled')
        throw problem(409,'Cancelled orders cannot be reopened');
      const tracking=String(input.trackingNumber||'').trim();
      if(tracking.length>120)throw problem(400,'Tracking number too long');
      const body={fulfillment_status:state,tracking_number:tracking||null};
      if(state==='delivered')body.delivered_at=now();
      const updated=await db('shop_orders?'+new URLSearchParams({id:'eq.'+id}),{method:'PATCH',body});
      return respond(200,{order:updated?.[0]});
    }
    if(input.action==='coupon'){
      const code=String(input.code||'').trim().toUpperCase();
      const type=String(input.type||'percent');
      const value=Number(input.value),minimum=Number(input.minimumUsdCents||0);
      const limit=input.maxUses===null||input.maxUses===''||input.maxUses===undefined?null:Number(input.maxUses);
      if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!['percent','fixed'].includes(type)
        ||!Number.isInteger(value)||value<=0||(type==='percent'&&value>100)
        ||!Number.isInteger(minimum)||minimum<0 || (limit!==null&&(!Number.isInteger(limit)||limit<1)))
        throw problem(400,'Invalid coupon settings');
      const expires=input.expiresAt?new Date(input.expiresAt):null;
      if(expires&&Number.isNaN(expires.getTime()))throw problem(400,'Invalid expiry');
      const row={code,discount_type:type,discount_value:value,minimum_usd_cents:minimum,
        max_uses:limit,active:input.active!==false,expires_at:expires?expires.toISOString():null};
      const existing=await db('shop_coupons?'+new URLSearchParams({select:'code',code:'eq.'+code}));
      if(existing?.length)await db('shop_coupons?'+new URLSearchParams({code:'eq.'+code}),{method:'PATCH',body:row});
      else await db('shop_coupons',{method:'POST',body:row});
      return respond(200,{code});
    }
    if(input.action==='moderate-review'){
      const id=uuid(input.reviewId),moderation=String(input.moderation||'');
      if(!['approved','rejected'].includes(moderation))throw problem(400,'Invalid review moderation state');
      const result=await db('shop_reviews?'+new URLSearchParams({id:'eq.'+id}),{
        method:'PATCH',body:{moderation}
      });
      if(!result?.length)throw problem(404,'Review not found');
      return respond(200,{reviewId:id,moderation});
    }
    return respond(400,{error:'Unknown action'});
  }catch(error){return fail(error);}
}
