// Opt-in static SEO generator. Run locally after content review; never deploy automatically.
// Required: SHOP_SUPABASE_URL and SHOP_SUPABASE_ANON_KEY (public key). Optional: SHOP_SEO_LIVE=true.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=String(process.env.SHOP_SUPABASE_URL||'').replace(/\/$/,'');
const anon=process.env.SHOP_SUPABASE_ANON_KEY;
const live=process.env.SHOP_SEO_LIVE==='true';
if(!/^https:\/\/[-a-z0-9]+\.supabase\.co$/i.test(base)||!anon)
  throw new Error('Set SHOP_SUPABASE_URL and SHOP_SUPABASE_ANON_KEY');
const result=await fetch(base+'/rest/v1/merch_items?'+new URLSearchParams({
  select:'id,title_ru,title_en,description_ru,description_en,category_ru,category_en,prices,in_stock,stock_status,merch_images(image_url,alt_ru,alt_en,sort_order)',
  is_published:'eq.true',
  order:'sort_order.asc'
}),{headers:{apikey:anon,Authorization:'Bearer '+anon}});
if(!result.ok) throw new Error('Supabase catalog fetch failed: '+result.status+' '+(await result.text()).slice(0,160));
const products=await result.json();
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const esc=xml;
const money=raw => {const s=String(raw||'').replaceAll(' ','').replace(',','.');
  return /^(0|[1-9]\d{0,6})(\.\d{1,2})?$/.test(s)?Number(s):null;};
const safeImg=s => {try{const u=new URL(String(s||''),'https://sacraglyph.com');
  return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const out=[];
for(const p of products) {
  const slug=String(p.id||'').replace(/[^a-z0-9_-]/gi,'');
  if(!slug||slug!==p.id) continue;
  const pictures=(p.merch_images||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const image=safeImg(pictures[0]?.image_url);
  const dollars=(p.prices||[]).find(x=>String(x.currency||'').toUpperCase()==='USD');
  const price=dollars?money(dollars.amount):null;
  const availability=(p.stock_status && p.stock_status!=='in')||p.in_stock===false?'OutOfStock':'InStock';
  for(const en of [false,true]) {
    const root=en?'en/products':'products';
    const filename=path.join(root,slug+'.html');
    const url='https://sacraglyph.com/'+(en?'en/':'')+'products/'+slug+'.html';
    const alternate='https://sacraglyph.com/'+(en?'':'en/')+'products/'+slug+'.html';
    const name=en?(p.title_en||p.title_ru):(p.title_ru||p.title_en);
    const description=en?(p.description_en||p.description_ru):(p.description_ru||p.description_en);
    const category=en?(p.category_en||p.category_ru):(p.category_ru||p.category_en);
    const title=name+' | bazookatattoo merch · Tbilisi, Georgia';
    const summary=String(description||category+' from bazookatattoo, Tbilisi, Georgia').slice(0,230);
    const productLD={
      '@context':'https://schema.org','@type':'Product',
      name,description:summary,sku:slug,brand:{'@type':'Brand',name:'bazookatattoo'},
      ...(image?{image:[image]}:{}),
      ...(price!==null&&price>0?{offers:{'@type':'Offer',url,
        priceCurrency:'USD',price:price.toFixed(2),
        availability:'https://schema.org/'+availability,
        itemCondition:'https://schema.org/NewCondition'}}:{})
    };
    const html=`<!doctype html><html lang="${en?'en':'ru'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${live?'index,follow,max-image-preview:large':'noindex,nofollow'}">
<title>${esc(title)}</title><meta name="description" content="${esc(summary)}">
<link rel="canonical" href="${xml(url)}">
<link rel="alternate" hreflang="ru-GE" href="https://sacraglyph.com/products/${xml(slug)}.html">
<link rel="alternate" hreflang="en-GE" href="https://sacraglyph.com/en/products/${xml(slug)}.html">
<meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(summary)}">
${image?`<meta property="og:image" content="${xml(image)}">`:''}
<script type="application/ld+json">${JSON.stringify(productLD).replaceAll('<','\\u003c')}</script>
<link rel="stylesheet" href="/assets/css/shop.css"></head>
<body><header class="shopHeader"><div class="shopWrap shopHeaderRow">
<a class="shopLogo" href="/${en?'en/':''}merch.html">bazookatattoo</a><nav>
<a href="/${en?'en/':''}merch.html">${en?'Merch':'Мерч'}</a>
<a href="/${en?'en/':''}merch.html">${en?'Shop':'Магазин'}</a>
<a href="${xml(alternate)}">${en?'RU':'EN'}</a></nav></div></header>
<main class="shopWrap"><section class="shopIntro"><p class="shopEyebrow">bazookatattoo · Tbilisi, Georgia</p>
<h1>${esc(name)}</h1><p>${esc(category)}</p></section>
${image?`<img src="${xml(image)}" alt="${esc(pictures[0]?.[en?'alt_en':'alt_ru']||name)}" style="max-width:620px;width:100%;border-radius:10px">`:''}
<p style="max-width:740px;white-space:pre-line">${esc(description||summary)}</p>
<p>${price!==null&&price>0?price.toFixed(2)+' USD · ':''}${en?availability==='InStock'?'In stock':'Out of stock':availability==='InStock'?'В наличии':'Нет в наличии'}</p>
<a class="shopJump" href="/${en?'en/':''}merch.html?product=${encodeURIComponent(slug)}#catalog" style="max-width:350px">${en?'View in shop':'Перейти в магазин'}</a>
</main><footer class="shopFooter"><div class="shopWrap">© bazookatattoo · Tbilisi, Georgia</div></footer></body></html>`;
    await mkdir(root,{recursive:true});await writeFile(filename,html,'utf8');
    if(live) out.push(url);
  }
}
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + out.map(u=>`  <url><loc>${xml(u)}</loc></url>`).join('\n')+'\n</urlset>\n';
await writeFile('sitemap-products.xml',sitemap,'utf8');
console.log('Generated',products.length,'products in RU/EN; indexable:',live,'(sitemap URL count:',out.length,')');
