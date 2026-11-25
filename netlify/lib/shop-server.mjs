// Server-only PayPal Sandbox + Supabase helpers. Never import into browser assets.
const env = process.env;
export function reply(statusCode, value) {
  return { statusCode, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' },
    body: JSON.stringify(value) };
}
export function settings() {
  if (env.PAYPAL_MODE !== 'sandbox') throw new Error('Sandbox-only test: set PAYPAL_MODE=sandbox');
  const clientId=env.PAYPAL_CLIENT_ID, secret=env.PAYPAL_CLIENT_SECRET;
  const supabaseUrl=env.SHOP_SUPABASE_URL, serviceKey=env.SHOP_SUPABASE_SERVICE_ROLE_KEY;
  if (!clientId || !secret || !supabaseUrl || !serviceKey) throw new Error('Missing sandbox payment or server-only Supabase configuration');
  let parsed;
  try { parsed=new URL(supabaseUrl); } catch { throw new Error('Invalid Supabase URL'); }
  const hosted=parsed.protocol==='https:' && /^[-a-z0-9]+\.supabase\.co$/i.test(parsed.hostname)
    && (parsed.pathname==='/' || parsed.pathname==='');
  const local=env.SHOP_ALLOW_LOCAL_SUPABASE==='1' && env.SHOP_CRM_TEST_MODE==='1'
    && parsed.protocol==='http:' && ['127.0.0.1','localhost'].includes(parsed.hostname)
    && parsed.port==='54321' && (parsed.pathname==='/' || parsed.pathname==='');
  if(env.SHOP_REQUIRE_LOCAL_DB==='1' && !local) throw new Error('Local-only test refuses remote database');
  if(!(hosted||local)) throw new Error('Invalid Supabase URL');
  return { clientId, secret, supabaseUrl:supabaseUrl.replace(/\/$/,''), serviceKey };
}
export async function requireUser(event) {
  const config = settings();
  const match=String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i);
  if(!match) throw Object.assign(new Error('Please sign in'),{status:401});
  const response=await fetch(config.supabaseUrl + '/auth/v1/user', {
    headers: { apikey:config.serviceKey, Authorization:'Bearer '+match[1] } });
  if(!response.ok) throw Object.assign(new Error('Session expired'),{status:401});
  const user=await response.json();
  if(!user.id || !user.email) throw Object.assign(new Error('Invalid session'),{status:401});
  return user;
}
export async function db(path, {method='GET', body, headers={}}={}) {
  const c=settings();
  const response=await fetch(c.supabaseUrl + '/rest/v1/' + path, {
    method,
    headers:{apikey:c.serviceKey,Authorization:'Bearer '+c.serviceKey,'Content-Type':'application/json',
      Prefer:method==='POST'?'return=representation':'return=minimal', ...headers},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!response.ok) throw new Error('Database error ('+response.status+'): '+(await response.text()).slice(0,300));
  if(response.status===204) return null;
  const data=await response.text();return data?JSON.parse(data):null;
}
export async function paypal(path,{method='POST',body,requestId}={}) {
  const c=settings();
  const credentials=Buffer.from(c.clientId+':'+c.secret).toString('base64');
  const tokenRes=await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+credentials,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  if(!tokenRes.ok) throw new Error('PayPal Sandbox authentication failed');
  const token=(await tokenRes.json()).access_token;
  const res=await fetch('https://api-m.sandbox.paypal.com'+path,{
    method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
      ...(requestId?{'PayPal-Request-Id':requestId}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error('PayPal Sandbox error ('+res.status+'): '+JSON.stringify(data).slice(0,500));
  return data;
}
export function usdCents(value) {
  const n=String(value).replaceAll(' ','').replace(',','.');
  if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(n)) throw Object.assign(new Error('Invalid USD price'),{status:400});
  const [whole,fraction='']=n.split('.');
  return Number(whole)*100+Number((fraction+'00').slice(0,2));
}
export function money(cents){return (cents/100).toFixed(2);}
export function fail(error) {
  const code=Number.isInteger(error?.status) && error.status>=400 && error.status<500?error.status:500;
  // Never expose secrets or raw provider errors.
  return reply(code,{error:code===500?'Sandbox checkout currently unavailable':error.message});
}
