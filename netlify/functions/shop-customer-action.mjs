import {cleaned,config,db,fail,now,problem,productId,respond,telegram,userFrom,uuid} from '../lib/shop-crm-server.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST')return respond(405,{error:'Method not allowed'});
  try{
    config();
    const user=await userFrom(event);
    const input=JSON.parse(event.body||'{}');
    if(input.action==='new-thread'){
      const body=cleaned(input.body);
      const subject=cleaned(input.subject||'Shop question',160);
      const product=input.productId?productId(input.productId):null;
      let order=null;
      if(product){
        const found=await db('merch_items?'+new URLSearchParams({select:'id',id:'eq.'+product,is_published:'eq.true'}));
        if(!found?.length)throw problem(404,'Product not available');
      }
      if(input.orderId){
        order=uuid(input.orderId);
        const owned=await db('shop_orders?'+new URLSearchParams({select:'id',id:'eq.'+order,user_id:'eq.'+user.id}));
        if(!owned?.length)throw problem(403,'Order not found');
      }
      const threads=await db('shop_threads?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{
        user_id:user.id,subject:user.email.slice(0,160),product_id:product,order_id:order,
        last_message_at:now(),customer_read_at:now()
      }});
      const thread=threads?.[0];
      if(!thread)throw new Error('Thread insert returned empty');
      await db('shop_messages',{method:'POST',body:{
        thread_id:thread.id,sender_role:'customer',sender_user_id:user.id,body
      }});
      const alert=await telegram('✉️ Новое обращение магазина\nТема: '+subject+'\nПокупатель: '+user.email
        +'\nЧат: '+thread.id+'\n'+body+'\nОтвет: тестовая админка /shop-admin.html#messages');
      return respond(200,{threadId:thread.id,notified:alert.delivered});
    }
    if(input.action==='send-message'){
      const threadId=uuid(input.threadId),body=cleaned(input.body);
      const found=await db('shop_threads?'+new URLSearchParams({
        select:'id,subject',id:'eq.'+threadId,user_id:'eq.'+user.id
      }));
      if(!found?.length)throw problem(403,'Conversation not found');
      const inserted=await db('shop_messages',{method:'POST',body:{
        thread_id:threadId,sender_role:'customer',sender_user_id:user.id,body
      }});
      await db('shop_threads?'+new URLSearchParams({id:'eq.'+threadId,user_id:'eq.'+user.id}),{
        method:'PATCH',body:{last_message_at:now(),customer_read_at:now()}
      });
      const alert=await telegram('💬 Новое сообщение магазина\nТема: '+found[0].subject
        +'\nПокупатель: '+user.email+'\nЧат: '+threadId+'\n'+body
        +'\nОтвет: тестовая админка /shop-admin.html#messages');
      return respond(200,{message:inserted?.[0],notified:alert.delivered});
    }
    if(input.action==='mark-read'){
      const threadId=uuid(input.threadId);
      const found=await db('shop_threads?'+new URLSearchParams({select:'id',id:'eq.'+threadId,user_id:'eq.'+user.id}));
      if(!found?.length)throw problem(403,'Conversation not found');
      await db('shop_threads?'+new URLSearchParams({id:'eq.'+threadId,user_id:'eq.'+user.id}),{
        method:'PATCH',body:{customer_read_at:now()}
      });
      return respond(200,{ok:true});
    }
    if(input.action==='review'){
      const orderId=uuid(input.orderId),id=productId(input.productId);
      const rating=Number(input.rating);
      if(!Number.isInteger(rating)||rating<1||rating>5)throw problem(400,'Rating must be 1 to 5');
      const body=String(input.body||'').trim();
      if(body.length>1500)throw problem(400,'Review is too long');
      const photo=input.photoPath?String(input.photoPath):null;
      if(photo&&!new RegExp('^'+user.id+'/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp)$').test(photo))
        throw problem(400,'Invalid review photo path');
      const owned=await db('shop_orders?'+new URLSearchParams({id:'eq.'+orderId,user_id:'eq.'+user.id,select:'id,status,fulfillment_status,items'}));
      const order=owned?.[0];
      if(!order||order.status!=='paid'||order.fulfillment_status!=='delivered'||
          !Array.isArray(order.items)||!order.items.some(item=>item.id===id))
        throw problem(403,'Reviews require a delivered and paid order containing this product');
      if(photo){
        const c=config();
        const head=await fetch(c.url+'/storage/v1/object/shop-review-photos/'+photo,{
          method:'HEAD',headers:{Authorization:'Bearer '+c.key,apikey:c.key}
        });
        if(!head.ok)throw problem(400,'Review photo was not uploaded');
      }
      const existing=await db('shop_reviews?'+new URLSearchParams({
        select:'id',user_id:'eq.'+user.id,order_id:'eq.'+orderId,product_id:'eq.'+id
      }));
      if(existing?.length)throw problem(409,'Review for this order and product already exists');
      const rows=await db('shop_reviews',{method:'POST',body:{
        user_id:user.id,order_id:orderId,product_id:id,rating,body,photo_path:photo,moderation:'pending'
      }});
      await telegram('⭐ Новый отзыв на модерации\nТовар: '+id+'\nЗаказ: '+orderId.slice(0,8)+'\nОценка: '+rating+'/5');
      return respond(200,{reviewId:rows?.[0]?.id,pendingModeration:true});
    }
    return respond(400,{error:'Unknown action'});
  }catch(error){return fail(error);}
}
