import {createHash} from 'node:crypto';
import {problem,userFrom} from './shop-crm-server.mjs';
export async function buyer(event,input) {
  if(event.headers?.authorization||event.headers?.Authorization){
    const user=await userFrom(event);
    return {id:user.id,scope:{user_id:'eq.'+user.id}};
  }
  if(!/^[a-f0-9]{64}$/.test(input.guestKey||''))throw problem(401,'Guest checkout session required');
  const hash=createHash('sha256').update(input.guestKey).digest('hex');
  return {id:null,hash,scope:{user_id:'is.null',guest_key_hash:'eq.'+hash}};
}
