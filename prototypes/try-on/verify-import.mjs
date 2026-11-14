import {readFile, writeFile} from 'node:fs/promises';

const base=process.env.VTON_TEST_URL ?? 'http://127.0.0.1:3195';
const catalog=await (await fetch(base+'/catalog')).json();
if(catalog.provider!=='free')throw Error('Ce test exige le fournisseur gratuit.');
const records=[];
async function call(path,data) {
  const start=performance.now();
  const response=await fetch(base+path,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)
  });
  const value=await response.json();
  const record={path,status:response.status,seconds:+((performance.now()-start)/1000).toFixed(2),value};
  records.push(record);
  console.log(JSON.stringify(record));
  return response.ok?value:null;
}

try {
  const input=await readFile(new URL('../../public/images/catalog/product-06-front.webp',import.meta.url));
  const item=await call('/import',{
    name:'Chemise Medina importée · validation',category:'tops',gender:'Mixte',
    variant:'Photo catalogue originale',photo:'data:image/webp;base64,'+input.toString('base64')
  });
  if(item) {
    const cases=[['importe',[item.id]],['composition',[item.id,'rivage']],['remplacement',['wild','rivage']],['retrait',['rivage']]];
    for(let index=0;index<cases.length;index++) {
      const [name,ids]=cases[index];
      const output=await call('/try',{ids});
      if(!output) {
        records.push({unverified:cases.slice(index).map(entry=>entry[0]),reason:'Le fournisseur ne retourne aucun résultat pour cet essai.'});
        break;
      }
      const response=await fetch(base+output.image);
      await writeFile(new URL('evidence/validation-'+name+'.png',import.meta.url),Buffer.from(await response.arrayBuffer()));
    }
  }
} catch(error) {
  records.push({error:error.message});
} finally {
  await writeFile(new URL('evidence/import-validation.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),provider:catalog.provider,records},null,2));
}
