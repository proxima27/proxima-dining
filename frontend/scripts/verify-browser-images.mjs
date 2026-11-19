// Check the actual dist/ over HTTP, not Vite's development transforms.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {preview} from 'vite';
import {checkBuild,readManifest,frontend} from './image-inventory.mjs';
checkBuild();
const urls=readManifest().map(x=>x.url), known=new Set(urls), failures=[];
const withApi=process.argv.includes('--with-api');
const server=await preview({root:frontend,logLevel:'error',preview:{host:'127.0.0.1',port:0,open:false}});
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try{
  browser=await chromium.launch({args:['--no-sandbox']});
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin===origin)return route.continue();
    failures.push(`Off-origin request: ${u.origin}${u.pathname}`);return route.abort();
  });
  ctx.on('response',r=>{
    if(r.request().resourceType()==='image' && (r.status()!==200 || !r.headers()['content-type']?.startsWith('image/'))) failures.push(`Image HTTP/MIME failure: ${r.url()}`);
  });
  const page=await ctx.newPage();
  // A local attribution page provides an origin and exercises every photo credit src.
  await page.goto(origin+'/photo-credits.html');
  const credited=await page.locator('img').evaluateAll(els=>els.map(e=>e.getAttribute('src')));
  credited.forEach(u=>assert(known.has(u),`Missing credits image ${u}`));
  const decoded=await page.evaluate(async list=>{
    let ok=0;
    for(let i=0;i<list.length;i+=8){await Promise.all(list.slice(i,i+8).map(async url=>{
      const image=new Image();image.src=url;await image.decode();
      if(!image.naturalWidth||!image.naturalHeight)throw Error('Failed image decode: '+url);
      ok++;
    }));}
    return ok;
  },urls);
  assert.equal(decoded,urls.length);
  console.log(`Chromium decoded ${decoded}/${urls.length} bundled images from the production server. All ${credited.length} photo-credit references are local.`);
  if(withApi){
    const views=[['/','.hero .caption'],['/restaurants','.cardpic img'],['/restaurants/maison-laurent','.gallery img'],['/cuisines','.cardpic img'],['/cuisines/japanese','.cardpic img'],['/categories','.cardpic img'],['/categories/eggs','.cardpic img'],['/food/copper-ladle-breakfast-club-yaji-steak-eggs','.detailintro'],['/about','.proseimg'],['/admin','.logincard']];
    for(const [route,ready] of views){
      await page.goto(origin+route);await page.locator(ready).first().waitFor({state:'attached',timeout:10000});
      const paths=await page.evaluate(async()=>{
        await document.fonts.ready;
        const all=new Set();
        document.querySelectorAll('img').forEach(e=>{if(e.dataset.fallback)throw Error('Unexpected image fallback: '+e.alt);all.add(e.currentSrc||e.src);});
        document.querySelectorAll('*').forEach(e=>{for(const m of getComputedStyle(e).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))all.add(m[1]);});
        for(const u of all){const im=new Image();im.src=u;await im.decode();}
        return Array.from(all);
      });
      for(const p of paths)assert(known.has(new URL(p).pathname),`Unknown image on ${route}: ${p}`);
    }
    console.log(`Verified inline images and CSS backgrounds on ${views.length} production routes with the catalogue API.`);
  }
  assert.deepEqual(failures,[]);console.log('PASS: no off-origin image or other network dependency was requested.');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.httpServer.close(resolve));
}
