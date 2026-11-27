// Add the storefront callback pages without replacing existing local Auth settings.
import {readFileSync,writeFileSync} from 'node:fs';
const path='supabase/config.toml';
const old=readFileSync(path,'utf8');
const callbacks=['cart','account','en/cart','en/account'].map(page=>'http://localhost:8888/'+page+'.html');
const config=old.replace(/(^\[auth\]\s*$)([\s\S]*?)(?=^\[|(?![\s\S]))/m,(section,heading,body)=>{
  const list=/^additional_redirect_urls\s*=\s*\[([^\]]*)\]/m;
  if(!list.test(body))return heading+'\nadditional_redirect_urls = '+JSON.stringify(callbacks)+'\n'+body;
  return heading+body.replace(list,(line,values)=>{
    const extra=callbacks.filter(url=>!values.includes('"'+url+'"'));
    return extra.length?'additional_redirect_urls = ['+[values.trim().replace(/,$/,''),...extra.map(v=>JSON.stringify(v))].filter(Boolean).join(', ')+']':line;
  });
});
if(config!==old)writeFileSync(path,config);
