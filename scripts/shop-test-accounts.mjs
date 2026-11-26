// Provision two independent accounts in local Supabase. Credentials stay in the terminal.
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {config,db} from '../netlify/lib/shop-crm-server.mjs';
for(const line of readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/)){
  const entry=line.match(/^(SHOP_[A-Z_]+)=(.*)$/);
  if(entry)process.env[entry[1]]=entry[2].trim();
}
if(process.env.SHOP_REQUIRE_LOCAL_DB!=='1')throw new Error('Local database required');
const {url,key}=config();
const suffix=randomBytes(4).toString('hex');
for(const role of ['buyer','admin']){
  const email=role+'-'+suffix+'@sacra.test';
  const password=randomBytes(18).toString('base64url');
  const result=await fetch(url+'/auth/v1/admin/users',{method:'POST',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({email,password,email_confirm:true})});
  if(!result.ok)throw new Error('Local account creation failed: '+result.status);
  const user=await result.json();
  if(role==='admin')await db('admin_users',{method:'POST',body:{user_id:user.id,email}});
  console.log(role+' | '+email+' | '+password);
}
