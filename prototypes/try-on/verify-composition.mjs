import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const base=process.env.VTON_TEST_URL ?? 'http://127.0.0.1:3195';
const catalog=await (await fetch(base+'/catalog')).json();
if(catalog.provider!=='free')throw Error('Ce test exige le moteur gratuit et refuse tout appel payant.');
const records=[];
let ids=[];
async function call(path,data,label) {
  const start=performance.now();
  const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  const value=await response.json();
  records.push({label,path,status:response.status,seconds:+((performance.now()-start)/1000).toFixed(2),value});
  console.log(JSON.stringify(records.at(-1)));
  return {ok:response.ok,value};
}
async function select(add,remove,expected) {
  const response=await call('/selection',{ids,add,remove},'sélection');
  assert.equal(response.ok,true);
  ids=response.value.ids;
  assert.deepEqual([...ids].sort(),[...expected].sort());
}
async function render(label) {
  const response=await call('/try',{ids},label);
  if(!response.ok)return;
  assert.deepEqual([...response.value.renderedIds].sort(),[...ids].sort());
  const image=await fetch(base+response.value.image);
  assert.equal(image.ok,true);
  await writeFile(new URL('evidence/'+label+'.png',import.meta.url),Buffer.from(await image.arrayBuffer()));
}

try {
  const imported={};
  for(const [key,name,category,variant,index] of [
    ['hoodie','Hoodie Sable','tops','Terre',3],
    ['dune','Pantalon Dune','bottoms','Sable',12],
    ['rivage','Pantalon Rivage','bottoms','Olive',14],
    ['wild','T-shirt Wild Cards','tops','Rose',1],
    ['atelier','Veste Atelier','outerwear','Sable',9],
    ['nomade','Veste Nomade','outerwear','Olive',11]
  ]) {
    const photo=await readFile(new URL('../../public/images/catalog/product-'+String(index).padStart(2,'0')+'-front.webp',import.meta.url));
    const response=await call('/import',{name,category,gender:'Mixte',variant,photo:'data:image/webp;base64,'+photo.toString('base64')},'import '+name);
    assert.equal(response.ok,true);
    imported[key]=response.value.id;
  }
  const {hoodie,dune,rivage,wild,atelier,nomade}=imported;
  await select(hoodie,undefined,[hoodie]);
  await render('sable-seul');
  await select(dune,undefined,[hoodie,dune]);
  await render('sable-dune');
  await select(rivage,undefined,[hoodie,rivage]);
  await render('sable-rivage');
  await select(wild,undefined,[wild,rivage]);
  await render('remplacement-hoodie');
  await select(undefined,wild,[rivage]);
  await render('retrait-haut');
  await select(wild,undefined,[wild,rivage]);
  await select(atelier,undefined,[wild,rivage,atelier]);
  await select(nomade,undefined,[wild,rivage,nomade]);
  await select(undefined,nomade,[wild,rivage]);
} catch(error) {
  records.push({testFailure:error.message});
  process.exitCode=1;
} finally {
  await writeFile(new URL('evidence/composition-validation.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),provider:catalog.provider,mannequin:'femme plastique',source:'Photos du catalogue de démonstration importées via HTTP',records},null,2));
}
