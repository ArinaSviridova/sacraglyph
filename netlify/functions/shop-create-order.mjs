import {telegram} from '../lib/shop-crm-server.mjs';
import {db,fail,money,paypal,reply,requireUser,settings,usdCents} from '../lib/shop-server.mjs';
export async function handler(event) {
  if(event.httpMethod!=='POST') return reply(405,{error:'Method not allowed'});
  try {
    settings();
    const user=await requireUser(event);
    const input=JSON.parse(event.body||'{}');
    if(!Array.isArray(input.items)||input.items.length===0||input.items.length>30) return reply(400,{error:'Cart is empty or too large'});
    const items=input.items.map(({id,qty,size,preorderAccepted})=>({
      id:String(id||''),qty:Number(qty),size:String(size||''),preorderAccepted:preorderAccepted===true
    }));
    if(items.some(p=>!/^[\w-]{1,128}$/.test(p.id)||!Number.isInteger(p.qty)||p.qty<1||p.qty>10||p.size.length>15))
      return reply(400,{error:'Invalid cart item'});
    if(new Set(items.map(p=>p.id+'|'+p.size)).size!==items.length) return reply(400,{error:'Duplicate cart lines'});
    const delivery=input.delivery||{};
    const name=String(delivery.name||'').trim().slice(0,120);
    const phone=String(delivery.phone||'').trim().slice(0,40);
    const city=String(delivery.city||'').trim().slice(0,100);
    const street=String(delivery.street||'').trim().slice(0,240);
    const postal=String(delivery.postal||'').trim().slice(0,24);
    const country=String(delivery.country||'GE').trim().toUpperCase();
    if(!name||!phone||!city||!street||!postal||country!=='GE')
      return reply(400,{error:'Complete a Georgian shipping address'});
    const priceShipping=process.env.SHOP_SHIPPING_USD;
    if(priceShipping===undefined) return reply(503,{error:'Shipping price not configured in the sandbox'});
    const shipping=usdCents(priceShipping);
    const ids=items.map(item=>item.id);
    const params=new URLSearchParams({select:'id,title_ru,title_en,prices,in_stock,stock_status,is_published',
      id:'in.('+ids.join(',')+')',is_published:'eq.true'});
    const rows=await db('merch_items?'+params.toString());
    const byId=new Map((rows||[]).map(row=>[row.id,row]));
    let subtotal=0;
    const snapshots=items.map(item=>{
      const row=byId.get(item.id);
      if(!row||!row.in_stock||!['in','preorder'].includes(row.stock_status)) throw Object.assign(new Error('A selected item is not available'),{status:409});
      if(row.stock_status==='preorder'&&!item.preorderAccepted) throw Object.assign(new Error('Preorder consent is required'),{status:409});
      const price=(row.prices||[]).find(p=>String(p.currency||'').toUpperCase()==='USD');
      if(!price) throw Object.assign(new Error('USD price missing for '+row.title_en),{status:409});
      const unit=usdCents(price.amount);
      if(unit<=0) throw Object.assign(new Error('Price must be positive'),{status:409});
      subtotal+=unit*item.qty;
      return {id:item.id,name:row.title_en||row.title_ru,size:item.size,quantity:item.qty,unit_usd_cents:unit,preorder:row.stock_status==='preorder'};
    });
    if(subtotal+shipping>999999999) return reply(400,{error:'Order is too large'});
    // Coupon is validated and priced only on the server. A client price or discount is never trusted.
    const promo=String(input.promoCode||'').trim().toUpperCase();
    let discount=0;
    if(promo){
      if(!/^[A-Z0-9_-]{3,30}$/.test(promo))return reply(400,{error:'Invalid promo code'});
      const coupons=await db('shop_coupons?'+new URLSearchParams({select:'*',code:'eq.'+promo,active:'eq.true'}));
      const coupon=coupons?.[0];
      if(!coupon||coupon.expires_at && Date.parse(coupon.expires_at)<=Date.now()
         ||subtotal<coupon.minimum_usd_cents)
        return reply(409,{error:'Promo code is not valid for this order'});
      if(coupon.max_uses!==null){
        const existing=await db('shop_orders?'+new URLSearchParams({select:'id',promo_code:'eq.'+promo,status:'eq.paid'}));
        if((existing||[]).length>=coupon.max_uses)return reply(409,{error:'Promo code usage limit reached'});
      }
      discount=coupon.discount_type==='percent'
        ?Math.floor(subtotal*coupon.discount_value/100)
        :Math.min(subtotal,coupon.discount_value);
      if(subtotal+shipping-discount<=0)return reply(409,{error:'PayPal cannot process a zero-value checkout'});
    }
    const order=await db('shop_orders',{method:'POST',body:{
      user_id:user.id,email:user.email,status:'pending',currency:'USD',subtotal_usd_cents:subtotal,
      shipping_usd_cents:shipping,discount_usd_cents:discount,promo_code:promo||null,total_usd_cents:subtotal+shipping-discount,items:snapshots,
      shipping_address:{name,phone,city,street,postal,country}
    }});
    const local=order?.[0];
    if(!local?.id) throw new Error('Could not create order');
    const result=await paypal('/v2/checkout/orders',{requestId:local.id,body:{
      intent:'CAPTURE',
      purchase_units:[{reference_id:local.id,custom_id:local.id,
        amount:{currency_code:'USD',value:money(subtotal+shipping-discount),
          breakdown:{item_total:{currency_code:'USD',value:money(subtotal)},
            shipping:{currency_code:'USD',value:money(shipping)},...(discount?{discount:{currency_code:'USD',value:money(discount)}}:{})}},
        items:snapshots.map(i=>({name:i.name.slice(0,127),
          quantity:String(i.quantity),category:'PHYSICAL_GOODS',
          unit_amount:{currency_code:'USD',value:money(i.unit_usd_cents)},
           description:((i.preorder?'Made to order; ':'')+(i.size?'Size '+i.size:'Standard')).slice(0,127)}))
      }]
    }});
    if(!result.id) throw new Error('No PayPal order ID');
    await db('shop_orders?id=eq.'+encodeURIComponent(local.id),{method:'PATCH',
      body:{paypal_order_id:result.id}});
    await telegram('🧾 Новый заказ (PayPal Sandbox, ожидает оплату)\nЗаказ: '+local.id+'\nПозиций: '+snapshots.length+'\nСумма: '+money(subtotal+shipping-discount)+' USD'+(promo?'\nПромокод: '+promo:''));
    return reply(200,{orderId:local.id,paypalOrderId:result.id});
  } catch(error){return fail(error);}
}
