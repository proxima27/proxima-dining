// Stable, origin-relative image paths form part of the published content contract.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const frontend = fileURLToPath(new URL('../', import.meta.url));
export const manifestFile = path.join(frontend, 'image-manifest.json');
export const readManifest = () => JSON.parse(fs.readFileSync(manifestFile, 'utf8')).images;
const supported = /\.(jpg|jpeg|png|svg|gif|webp|avif|ico)$/i;
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => {
    const f=path.join(dir,e.name);
    assert(!e.isSymbolicLink(),`Media must be real files, not symlinks: ${f}`);
    return e.isDirectory()?walk(f):[f];
  });
}
export function inventory(dir){
  return walk(dir).filter(f=>supported.test(f)).map(f=>{
    const data=fs.readFileSync(f);
    assert(data.length>0,`Empty image: ${f}`);
    return {url:'/'+path.relative(dir,f).split(path.sep).join('/'), bytes:data.length, sha256:createHash('sha256').update(data).digest('hex')};
  }).sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0);
}
export function checkBuild(){
  const manifest=readManifest();
  for(const directory of ['public','dist'])assert.deepEqual(inventory(path.join(frontend,directory)),manifest,`${directory} image inventory differs from the release manifest. Review changed photos before updating it.`);
  console.log(`Verified ${manifest.length} source and production images: paths, byte sizes and SHA-256 hashes match.`);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--write')){
    const images=inventory(path.join(frontend,'public'));
    fs.writeFileSync(manifestFile,JSON.stringify({version:1,images},null,2)+'\n');
    console.log(`Recorded ${images.length} local images.`);
  }else checkBuild();
}
