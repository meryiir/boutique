import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {digest} from './runware-store.mjs';

const base=process.env.RUNWARE_TEST_URL ?? 'http://127.0.0.1:3201';
const info=await (await fetch(base+'/catalog')).json();
assert.equal(info.model,'prunaai:p-image@try-on');
assert.equal(info.settings.turbo,false);
assert.equal(info.keyConfigured,true,'Clé serveur manquante.');
assert.equal(info.authorized,true,'Autorisation Runware manquante.');
const plan=JSON.parse(await readFile(new URL('runware-plan.json',import.meta.url),'utf8'));
const directory=new URL('evidence/runware-standard/',import.meta.url);
await mkdir(directory,{recursive:true});
const manifestFile=new URL('manifest.json',directory);
let manifest;
try {manifest=JSON.parse(await readFile(manifestFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
manifest ??= {model:info.model,settings:info.settings,source:plan.source,started:new Date().toISOString(),cases:[],quality:'pending_real_visual_inspection'};
async function post(path,data) {
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await response.json();if(!response.ok)throw Error(body.error);return body;
}
async function download(path,filename,hash) {
  const response=await fetch(base+path);assert.equal(response.ok,true);
  const bytes=Buffer.from(await response.arrayBuffer());if(hash)assert.equal(digest(bytes),hash);
  await writeFile(new URL(filename,directory),bytes);return digest(bytes);
}
let state;
const imported={};
try {
  for(const variant of plan.variants) {
    const photo=await readFile(new URL('../../public/'+variant.file,import.meta.url));
    const item=await post('/import',{...variant,photo:'data:image/webp;base64,'+photo.toString('base64'),quality:{hanger:'present',background:'plain',framing:'complete'}});
    imported[variant.product+'/'+variant.variant]=item.id;
  }
  for(const scenario of plan.cases) {
    if(!state||scenario.newSession) {
      if(state)await post('/exit',{session:state.session});
      state=await post('/session',{gender:scenario.gender ?? 'Femme'});
    } else if(scenario.gender&&state.gender!==scenario.gender)state=await post('/selection',{session:state.session,revision:state.revision,gender:scenario.gender});
    for(const remove of scenario.remove ?? [])state=await post('/selection',{session:state.session,revision:state.revision,remove});
    for(const name of scenario.items)state=await post('/selection',{session:state.session,revision:state.revision,id:imported[name]});
    assert.deepEqual(state.selected.map(item=>item.id).sort(),scenario.items.map(name=>imported[name]).sort());
    const started=Date.now();
    const record={name:scenario.name,gender:state.gender,selected:state.selected,quality:'pending_real_visual_inspection'};
    try {
      const output=await post('/try',{session:state.session,revision:state.revision,requestId:randomUUID()});
      record.seconds=(Date.now()-started)/1000;record.output=output;
      record.sha256=await download(output.image,scenario.name+'.png');
    } catch(error){record.error=error.message;}
    manifest.cases.push(record);
    await writeFile(manifestFile,JSON.stringify(manifest,null,2));
    console.log(JSON.stringify({name:scenario.name,received:!!record.output,error:record.error}));
  }
} finally {
  if(state)await post('/exit',{session:state.session});
  manifest.audit=await (await fetch(base+'/audit')).json();
  for(const job of manifest.audit.jobs) {
    await download('/photo/'+job.metadata.mannequin,job.id+'-person.webp',job.metadata.mannequin);
    for(const [index,item] of job.metadata.variants.entries())await download('/photo/'+item.hash,job.id+'-garment-'+index+'.image',item.hash);
    if(job.state==='completed')await download('/result/'+job.id,job.id+'-raw.png');
  }
  manifest.updated=new Date().toISOString();
  await writeFile(manifestFile,JSON.stringify(manifest,null,2));
}
if(manifest.cases.some(item=>item.error))process.exitCode=1;
