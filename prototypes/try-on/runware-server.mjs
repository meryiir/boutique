import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {categories,choosePiece,checkPhoto,fail,textField} from './runware-domain.mjs';
import {RunwareStore,digest} from './runware-store.mjs';
import {RUNWARE_MODEL,STANDARD_SETTINGS,mannequinPrompt,buildRunwareTask,runwareTryOn} from './runware-provider.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
export function createRunwareServer({directory=resolve(here,'.data/runware'),publicRoot=resolve(here,'../../public'),store='maison-edit-runware-pilot',key='',authorized=false,transport=runwareTryOn}={}) {
  const database=new RunwareStore(resolve(directory,'pilot.sqlite'),store);
  const sessions=new Map(),pending=new Map();
  const mannequins={};
  for(const gender of ['Femme','Homme']) {
    const bytes=readFileSync(resolve(publicRoot,'images/fitting/mannequin-'+gender.toLowerCase()+'.webp'));
    mannequins[gender]={bytes,mime:'image/webp',hash:digest(bytes)};
    database.saveReference(mannequins[gender]);
  }
  let requests=[];
  function session(id) {
    const state=sessions.get(id);
    if(!state||state.closed||Date.now()-state.touched>1800000)fail('Session terminée. Ouvrez une nouvelle cabine.',410);
    state.touched=Date.now();return state;
  }
  function pieces(state) {
    return Object.keys(categories).filter(slot=>state.selection[slot]).map(slot=>{
      const item=database.item(state.selection[slot]);
      if(!item||item.category!==slot||!['Mixte',state.gender].includes(item.gender))fail('Article incompatible ou catalogue modifié.');
      return item;
    });
  }
  function snapshot(state) {return {session:state.id,gender:state.gender,revision:state.revision,selected:pieces(state)};}
  function payload(state) {
    const selected=pieces(state);
    const person=mannequins[state.gender];
    const metadata={store,mannequin:person.hash,gender:state.gender,model:RUNWARE_MODEL,settings:STANDARD_SETTINGS,seed:42,prompt:mannequinPrompt,variants:selected.map(item=>({id:item.id,product:item.product,variant:item.variant,category:item.category,color:item.color,hash:item.hash}))};
    return {selected,person,metadata,cacheKey:digest(JSON.stringify(metadata))};
  }
  function ability(state) {
    const body=payload(state),cached=database.find(body.cacheKey),costs=database.costs();
    let reason='';
    if(body.selected.length>3)reason='Ce pilote évalue au plus trois pièces par calcul. La sélection reste disponible.';
    else if(body.selected.length&&cached?.state!=='completed') {
      if(!authorized||!key)reason='Calcul payant verrouillé. Clé et accord de budget requis.';
      else if(cached)reason='Une tâche identique est en cours ou incertaine. Consulter le journal avant de relancer.';
      else if(costs.requests>=costs.limitRequests||costs.reserved+40000>costs.limitMicros||costs.maximum>40000)reason='Plafond atteint ou coût à réévaluer.';
    }
    return {available:!reason,reason,cached:cached?.state==='completed',estimatedUsd:body.selected.length?0.015+0.008*(body.selected.length-1):0};
  }
  function send(res,status,body,mime='application/json') {
    if(res.destroyed)return;
    res.writeHead(status,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(mime==='application/json'?JSON.stringify(body):body);
  }
  async function readBody(req) {
    const chunks=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>8500000)fail('Photo trop lourde, maximum 6 Mo.',413);chunks.push(chunk);}
    try {const input=JSON.parse(Buffer.concat(chunks).toString());if(!input||Array.isArray(input)||typeof input!=='object')throw Error();return input;}catch{fail('JSON invalide.');}
  }
  const server=createServer(async(req,res)=>{
    try {
      const port=server.address().port;
      if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host))fail('Hôte refusé.',403);
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)fail('Origine refusée.',403);
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      if(req.method==='GET') {
        const files={'/':['runware.html','text/html; charset=utf-8'],'/runware-ui.js':['runware-ui.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css']};
        if(files[path]){const [name,mime]=files[path];return send(res,200,readFileSync(resolve(here,name)),mime);}
        if(path==='/catalog')return send(res,200,{catalog:database.catalog(),categories,model:RUNWARE_MODEL,settings:STANDARD_SETTINGS,authorized,keyConfigured:!!key,costs:database.costs()});
        if(path==='/state'){const state=session(url.searchParams.get('session'));return send(res,200,{...snapshot(state),ability:ability(state)});}
        if(path==='/audit')return send(res,200,{costs:database.costs(),jobs:database.audit(),quality:'pending_real_visual_validation'});
        if(path.startsWith('/photo/')){const photo=database.photo(path.slice(7));return send(res,200,photo.bytes,photo.mime);}
        if(path==='/mannequin') {const person=mannequins[url.searchParams.get('gender')];if(!person)fail('Genre invalide.');return send(res,200,person.bytes,person.mime);}
        if(path.startsWith('/garment/')) {
          const item=database.item(path.slice(9));if(!item)fail('Article inconnu.');
          const photo=database.photo(url.searchParams.get('hash')||item.hash);return send(res,200,photo.bytes,photo.mime);
        }
        if(path.startsWith('/result/')) {
          const job=database.job(path.slice(8));if(!job?.image)fail('Résultat absent.',404);return send(res,200,Buffer.from(job.image),'image/png');
        }
      }
      if(req.method!=='POST')return send(res,404,{error:'Ressource introuvable.'});
      requests=requests.filter(time=>time>Date.now()-60000);
      if(requests.length>=120)fail('Limite de 120 requêtes par minute.',429);
      requests.push(Date.now());
      const input=await readBody(req);
      if(path==='/session') {
        const gender=input.gender ?? 'Femme';if(!mannequins[gender])fail('Genre invalide.');
        const state={id:randomUUID(),gender,revision:0,selection:{},touched:Date.now(),closed:false};sessions.set(state.id,state);
        return send(res,201,{...snapshot(state),ability:ability(state)});
      }
      if(path==='/import') {
        const item={product:textField(input.product),variant:textField(input.variant),name:textField(input.name),color:textField(input.color),gender:input.gender,category:input.category};
        if(!['Mixte','Femme','Homme'].includes(item.gender)||!Object.hasOwn(categories,item.category))fail('Genre ou catégorie invalide.');
        const photo=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input.photo ?? '');
        if(!photo)fail('Photo originale importée requise, les URL distantes ne sont pas acceptées.');
        const bytes=Buffer.from(photo[2],'base64');if(bytes.length>6000000)fail('Photo trop lourde.',413);
        const quality=await checkPhoto(bytes,input.quality ?? {});
        const imported=database.import(item,bytes,quality);
        for(const state of sessions.values())if(Object.values(state.selection).includes(imported.id)) {
          const stale=Object.entries(state.selection).find(([,id])=>id===imported.id);
          if(stale&&(stale[0]!==item.category||!['Mixte',state.gender].includes(item.gender)))delete state.selection[stale[0]];
          state.revision++;
        }
        return send(res,201,imported);
      }
      const state=session(input.session);
      if(path==='/exit'){state.closed=true;sessions.delete(state.id);return send(res,200,{closed:true});}
      if(input.revision!==state.revision)fail('La sélection a changé. Actualisez la cabine.',409);
      if(path==='/selection') {
        if(input.gender!==undefined) {
          if(!mannequins[input.gender])fail('Genre invalide.');state.gender=input.gender;state.selection={};
        } else if(input.id) {
          const item=database.item(input.id);if(!item||!['Mixte',state.gender].includes(item.gender))fail('Article inconnu ou genre incompatible.');
          state.selection=choosePiece(state.selection,item);
        } else if(Object.hasOwn(categories,input.remove))delete state.selection[input.remove];
        else fail('Action de sélection invalide.');
        state.revision++;
        return send(res,200,{...snapshot(state),ability:ability(state)});
      }
      if(path!=='/try')return send(res,404,{error:'Ressource introuvable.'});
      if(!/^[a-f0-9-]{36}$/.test(input.requestId ?? ''))fail('Identifiant de demande requis.');
      const revision=state.revision;
      const body=payload(state);
      if(!body.selected.length)return send(res,200,{...snapshot(state),image:'/mannequin?gender='+state.gender,cached:true});
      const ready=ability(state);
      if(body.selected.length>3)fail(ready.reason,400);
      let job=database.find(body.cacheKey);
      if(job?.state!=='completed') {
        let task=pending.get(body.cacheKey);
        if(!task) {
          if(!ready.available)fail(ready.reason,403);
          const reservation=database.reserve(body.cacheKey,body.metadata,{authorized,keyConfigured:!!key});
          if(reservation.existing)fail('Une tâche identique existe déjà. Aucun doublon créé.',409);
          const taskUUID=reservation.id;
          const request=buildRunwareTask(body.person,body.selected.map(item=>database.photo(item.hash)),taskUUID);
          task=(async()=>{
            try {
              const output=await transport(request,key);
              const meta=await sharp(output.bytes,{limitInputPixels:20000000}).metadata();
              if(meta.format!=='png')throw Error('Image moteur invalide.');
              database.finish(taskUUID,output.bytes,output.costMicros);
              return database.job(taskUUID);
            } catch(error){database.failed(taskUUID,error);throw error;}
            finally{pending.delete(body.cacheKey);}
          })();
          pending.set(body.cacheKey,task);
        }
        job=await task;
      }
      if(state.closed||state.revision!==revision)fail('Résultat conservé en cache, demande devenue obsolète.',409);
      return send(res,200,{...snapshot(state),requestId:input.requestId,taskUUID:job.id,image:'/result/'+job.id,cached:ready.cached,measuredUsd:job.actual/1000000});
    } catch(error) {send(res,error.status ?? 502,{error:error.status?error.message:'Calcul distant échoué. Consultez le journal du pilote, aucune relance automatique.'});}
  });
  return {server,database};
}
