// Refresh the search-visible HTML from the same published collections as the storefront.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const origin='https://sacraglyph.com';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imageURL(value){
  if(!value)return '';
  try{const u=new URL(value,origin);return u.protocol==='https:'?u.href:'';}catch{return '';}
}
async function publishedCatalog(){
  const settings=await readFile('assets/js/supabase-config.js','utf8');
  const url=settings.match(/url:\s*"([^"]+)"/)[1],key=settings.match(/anonKey:\s*"([^"]+)"/)[1];
  const fields='id,title_ru,title_en,text_ru,text_en,merch_items(id,title_ru,title_en,in_stock,stock_status,prices,merch_images(image_url,alt_ru,alt_en,sort_order))';
  const params=new URLSearchParams({select:fields,is_published:'eq.true','merch_items.is_published':'eq.true',order:'sort_order.asc','merch_items.order':'sort_order.asc','merch_items.merch_images.order':'sort_order.asc'});
  const res=await fetch(url+'/rest/v1/merch_collections?'+params,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new Error('Public catalog HTTP '+res.status);
  return (await res.json()).map(c=>({...c,items:c.merch_items.map(p=>({...p,images:p.merch_images}))}));
}
export async function render(catalog){
  for(const lang of ['ru','en']){
    const en=lang==='en',path=(en?'en/':'')+'merch.html',url=origin+(en?'/en':'')+'/merch';
    const label=(o,field)=>o[field+'_'+lang]||o[field+'_ru']||o[field+'_en']||'';
    const groups=catalog.filter(c=>c.items.length);
    const names=groups.map(c=>label(c,'title'));
    const title=en?'Artist merch from Tbilisi | Sacra Glyph · bazookatattoo':'Авторский мерч из Тбилиси | Sacra Glyph · bazookatattoo';
    const description=(en?'Explore artist clothing by bazookatattoo from Tbilisi, Georgia. Collections: ':'Каталог авторской одежды bazookatattoo из Тбилиси. Коллекции: ')+names.join(', ')+'.';
    const html=groups.map(c=>{
      const id='collection-'+c.id, heading=label(c,'title');
      const rank=i=>i.stock_status==='in'&&i.in_stock!==false?0:i.stock_status==='preorder'?1:2;
      const items=c.items.slice().sort((a,b)=>rank(a)-rank(b));
      const cards=items.map((p,i)=>{
        const availability=p.in_stock!==false && p.stock_status==='in'?(en?'In stock':'В наличии'):(en?'Out of stock':'Нет в наличии');
        const prices=(p.prices||[]).filter(v=>v.amount&&v.currency).map(v=>v.amount+' '+v.currency);
        const name=label(p,'title'),pic=p.images?.[0],src=imageURL(pic?.image_url);
        return `<article class="merchItem"><div class="merchCard"><div class="merchMedia">${src?`<img class="merchCardImg" src="${esc(src)}" alt="${esc(label(pic,'alt')||name)}" loading="${i===0?'eager':'lazy'}" decoding="async">`:''}</div><div class="merchBody"><div class="merchTitle">${esc(name)}</div><div class="merchMeta merchMetaVisible">${esc([...prices,availability].join(' · '))}</div></div></div></article>`;
      }).join('\n');
      return `<section class="merchCollection" id="${esc(id)}"><div class="merchCollectionHead"><h2 class="merchCollectionTitle">${esc(heading)}</h2><p class="merchCollectionText">${esc(label(c,'text'))}</p></div><div class="merchRow" data-merch-row>${cards}</div></section>`;
    }).join('\n');
    const ld={'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url,inLanguage:lang,
      mainEntity:{'@type':'ItemList',itemListElement:groups.map((c,i)=>({'@type':'ListItem',position:i+1,name:label(c,'title'),url:url+'#collection-'+encodeURIComponent(c.id)}))}};
    let page=await readFile(path,'utf8');
    page=page.replace(/<!-- merch:catalog -->[\s\S]*?<!-- \/merch:catalog -->/,()=>`<!-- merch:catalog --><div id="merchCollections" class="merchCollections">${html}</div><!-- /merch:catalog -->`);
    page=page.replace(/<title>.*?<\/title>/,()=>'<title>'+esc(title)+'</title>')
      .replace(/((?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g,(_,prefix)=>prefix+esc(description))
      .replace(/((?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g,(_,prefix)=>prefix+esc(title))
      .replace(/<script type="application\/ld\+json" id="merch-seo">[\s\S]*?<\/script>/,()=>'<script type="application/ld+json" id="merch-seo">'+JSON.stringify(ld).replaceAll('<','\\u003c')+'</script>');
    await writeFile(path,page);
  }
}
export async function refreshCatalog(){await render(await publishedCatalog());}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await refreshCatalog();
