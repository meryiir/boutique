import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const base=process.env.VTON_TEST_URL ?? 'http://127.0.0.1:3199';
const ready=await (await fetch(base+'/pilot-status')).json();
assert.equal(ready.provider,'fashn');
assert.equal(ready.model,'tryon-v1.6');
assert.equal(ready.replay,false);
assert.equal(ready.authorized,true,'Autorisation explicite manquante.');
assert.equal(ready.keyConfigured,true,'Clé serveur manquante.');
assert.equal(ready.budget,10,'Le pilote doit être plafonné à 10 crédits.');

const folder=new URL('evidence/fashn-pilot/',import.meta.url);
await mkdir(folder,{recursive:true});
const manifestFile=new URL('manifest.json',folder);
let manifest;
try {manifest=JSON.parse(await readFile(manifestFile,'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;}
manifest ??= {provider:'fashn',model:ready.model,started:new Date().toISOString(),mannequin:'femme plastique',source:'Photos du catalogue de démonstration importées par HTTP',imported:{},cases:[],quality:'pending_inspection',jackets:'not_evaluated'};
assert.equal(manifest.provider,'fashn');
const save=()=>writeFile(manifestFile,JSON.stringify(manifest,null,2));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function photo(path,filename,expectedHash) {
  const response=await fetch(base+path);
  assert.equal(response.ok,true,'Image de preuve inaccessible.');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(expectedHash)assert.equal(hash(bytes),expectedHash,'Empreinte de la preuve différente de l’entrée moteur.');
  await writeFile(new URL(filename,folder),bytes);
  return hash(bytes);
}
async function post(path,data) {
  const start=performance.now();
  const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  return {status:response.status,seconds:+((performance.now()-start)/1000).toFixed(2),response:await response.json()};
}

try {
  await photo('/image/reference','mannequin-reference.png');
  const catalog=await (await fetch(base+'/catalog')).json();
  for(const [name,category,variant,index] of [
    ['Hoodie Sable','tops','Terre',3],['Pantalon Dune','bottoms','Sable',12],
    ['Pantalon Rivage','bottoms','Olive',14],['T-shirt Wild Cards','tops','Rose',1]
  ]) {
    if(manifest.imported[name]) {
      assert.ok(catalog.catalog.some(item=>item.id===manifest.imported[name]),'Catalogue du pilote modifié. Conserver ses données persistantes.');
      continue;
    }
    const source=await readFile(new URL('../../public/images/catalog/product-'+String(index).padStart(2,'0')+'-front.webp',import.meta.url));
    const answer=await post('/import',{name,category,variant,gender:'Mixte',photo:'data:image/webp;base64,'+source.toString('base64')});
    assert.equal(answer.status,201);
    manifest.imported[name]=answer.response.id;
    await save();
  }
  const hoodie=manifest.imported['Hoodie Sable'],dune=manifest.imported['Pantalon Dune'];
  const rivage=manifest.imported['Pantalon Rivage'],wild=manifest.imported['T-shirt Wild Cards'];
  const cases=[['hoodie-seul',[hoodie]],['hoodie-dune',[hoodie,dune]],['hoodie-rivage',[hoodie,rivage]],['remplacement-hoodie',[wild,rivage]],['retrait-haut',[rivage]]];
  for(const [name,ids] of cases) {
    if(manifest.cases.some(item=>item.name===name&&item.status===200))continue;
    const answer=await post('/try',{ids});
    const record={name,ids,...answer,quality:'pending_inspection'};
    manifest.cases.push(record);
    await save();
    if(answer.status===200) {
      assert.deepEqual([...answer.response.renderedIds].sort(),[...ids].sort());
      record.image=name+'.png';
      record.sha256=await photo(answer.response.image,record.image);
    }
    console.log(JSON.stringify({name,status:answer.status,calls:answer.response.calls,seconds:answer.seconds}));
    await save();
  }
} catch(error) {
  manifest.error=error.message;
  process.exitCode=1;
} finally {
  const audit=await (await fetch(base+'/pilot-status')).json();
  manifest.reservedCredits=audit.reserved;
  manifest.attempts=audit.attempts;
  for(const attempt of audit.attempts) {
    if(!['completed','output-error'].includes(attempt.state))continue;
    attempt.outputSha256=await photo('/pilot-output/'+attempt.id,attempt.id+'-raw.png');
    await photo('/pilot-input/'+attempt.id+'/person',attempt.id+'-person.png',attempt.inputs.person);
    await photo('/pilot-input/'+attempt.id+'/garment',attempt.id+'-garment.png',attempt.inputs.garment);
  }
  manifest.updated=new Date().toISOString();
  await save();
  if(manifest.cases.filter(item=>item.status===200).length<5)process.exitCode=1;
}
