// Server-only CRM tools for ISOLATED Supabase test DB. Never import into client JS.
const env=process.env;
export const respond=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)});
export function problem(status,message){return Object.assign(new Error(message),{status});}
export function fail(error){const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<500?error.status:500;
  if(status===500) console.error('[shop crm]',error);
  return respond(status,{error:status===500?'Temporary shop CRM error':error.message});
}
export function config(){
  if(env.SHOP_CRM_TEST_MODE!=='1') throw problem(503,'CRM test mode is disabled');
  const url=String(env.SHOP_SUPABASE_URL||'').replace(/\/$/,'');
  const key=env.SHOP_SUPABASE_SERVICE_ROLE_KEY;
  if(!/^https:\/\/[-a-z0-9]+\.supabase\.co$/i.test(url)||!key) throw problem(503,'Test Supabase is not configured');
  return {url,key};
}
export async function db(path,{method='GET',body,headers={}}={}){
  const {url,key}=config();
  const response=await fetch(url+'/rest/v1/'+path,{
    method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',
      Prefer:method==='POST'?'return=representation':method==='PATCH'?'return=representation':'return=minimal',...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const text=await response.text();
  if(!response.ok)throw new Error('Supabase REST error '+response.status+': '+text.slice(0,200));
  return text?JSON.parse(text):null;
}
export async function userFrom(event){
  const {url,key}=config();
  const token=String(event.headers?.authorization||event.headers?.Authorization||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) throw problem(401,'Sign in first');
  const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});
  if(!r.ok)throw problem(401,'Login session expired');
  const user=await r.json();
  if(!user?.id||!user?.email)throw problem(401,'Invalid login');
  return user;
}
export async function requireAdmin(user){
  const rows=await db('admin_users?'+new URLSearchParams({select:'user_id',user_id:'eq.'+user.id,limit:'1'}));
  if(!rows?.length)throw problem(403,'Administrator access required');
}
export function uuid(value){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||'')))
    throw problem(400,'Invalid identifier');
  return String(value);
}
export function productId(value){
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(String(value||'')))throw problem(400,'Invalid product');
  return String(value);
}
export function cleaned(value,max=2000){const result=String(value||'').trim();if(!result||result.length>max)throw problem(400,'Invalid text length');return result;}
export async function telegram(text){
  const token=env.SHOP_TG_BOT_TOKEN,chat=env.SHOP_TG_CHAT_ID;
  if(!token||!chat)return {configured:false,delivered:false};
  // No browser access to this function or the token. Outgoing requests work from Netlify Dev.
  try {
    const data={chat_id:chat,text:String(text).slice(0,3500),disable_web_page_preview:true};
    if(env.SHOP_TG_TOPIC_ID)data.message_thread_id=Number(env.SHOP_TG_TOPIC_ID);
    const res=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
    });
    const answer=await res.json();
    if(!res.ok||!answer.ok){console.error('[shop tg] delivery error',res.status,answer.description);return {configured:true,delivered:false};}
    return {configured:true,delivered:true};
  }catch(error){console.error('[shop tg] network error',error.message);return {configured:true,delivered:false};}
}
export function now(){return new Date().toISOString();}
