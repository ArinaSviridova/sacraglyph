import {db,fail,money,paypal,reply,requireUser,settings,usdCents} from '../lib/shop-server.mjs';
export async function handler(event) {
  if(event.httpMethod!=='POST') return reply(405,{error:'Method not allowed'});
  try {
    settings();
    const user=await requireUser(event);
    const input=JSON.parse(event.body||'{}');
    if(!Array.isArray(input.items)||input.items.length===0||input.items.length>30) return reply(400,{error:'Cart is empty or too large'});
    const items=input.items.map(({id,qty,size})=>({
      id:String(id||''),qty:Number(qty),size:String(size||'')
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
      if(!row||!row.in_stock||row.stock_status!=='in') throw Object.assign(new Error('A selected item is not available'),{status:409});
      const price=(row.prices||[]).find(p=>String(p.currency||'').toUpperCase()==='USD');
      if(!price) throw Object.assign(new Error('USD price missing for '+row.title_en),{status:409});
      const unit=usdCents(price.amount);
      if(unit<=0) throw Object.assign(new Error('Price must be positive'),{status:409});
      subtotal+=unit*item.qty;
      return {id:item.id,name:row.title_en||row.title_ru,size:item.size,quantity:item.qty,unit_usd_cents:unit};
    });
    if(subtotal+shipping>999999999) return reply(400,{error:'Order is too large'});
    const order=await db('shop_orders',{method:'POST',body:{
      user_id:user.id,email:user.email,status:'pending',currency:'USD',subtotal_usd_cents:subtotal,
      shipping_usd_cents:shipping,total_usd_cents:subtotal+shipping,items:snapshots,
      shipping_address:{name,phone,city,street,postal,country}
    }});
    const local=order?.[0];
    if(!local?.id) throw new Error('Could not create order');
    const result=await paypal('/v2/checkout/orders',{requestId:local.id,body:{
      intent:'CAPTURE',
      purchase_units:[{reference_id:local.id,custom_id:local.id,
        amount:{currency_code:'USD',value:money(subtotal+shipping),
          breakdown:{item_total:{currency_code:'USD',value:money(subtotal)},
            shipping:{currency_code:'USD',value:money(shipping)}}},
        items:snapshots.map(i=>({name:i.name.slice(0,127),
          quantity:String(i.quantity),category:'PHYSICAL_GOODS',
          unit_amount:{currency_code:'USD',value:money(i.unit_usd_cents)},
          description:(i.size?'Size '+i.size:'Standard').slice(0,127)}))
      }]
    }});
    if(!result.id) throw new Error('No PayPal order ID');
    await db('shop_orders?id=eq.'+encodeURIComponent(local.id),{method:'PATCH',
      body:{paypal_order_id:result.id}});
    return reply(200,{orderId:local.id,paypalOrderId:result.id});
  } catch(error){return fail(error);}
}
