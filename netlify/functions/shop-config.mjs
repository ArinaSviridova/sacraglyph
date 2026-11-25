import {reply} from '../lib/shop-server.mjs';
export async function handler() {
  const active = process.env.PAYPAL_MODE==='sandbox' && Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.SHOP_SUPABASE_URL && process.env.SHOP_SUPABASE_SERVICE_ROLE_KEY);
  return reply(200,{sandbox:true,ready:active,clientId:active?process.env.PAYPAL_CLIENT_ID:null,currency:'USD'});
}
