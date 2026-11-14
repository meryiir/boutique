import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import sharp from 'sharp';
import {buildRunwareTask,runwareTryOn} from './runware-provider.mjs';
import {RunwareStore,digest} from './runware-store.mjs';
import {createRunwareServer} from './runware-server.mjs';
import {choosePiece} from './runware-domain.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(resolve(here,'.data'),{recursive:true});
const temporary=()=>mkdtempSync(resolve(here,'.data/runware-test-'));
const png=await sharp({create:{width:512,height:768,channels:3,background:'#d7cabc'}}).png().toBuffer();
async function start(t,options={}) {
  const runtime=createRunwareServer({directory:temporary(),key:'mock-key-never-real',authorized:true,...options});
  await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>runtime.server.close(resolve));runtime.database.close();});
  const base='http://127.0.0.1:'+runtime.server.address().port;
  async function post(path,input,status=200) {
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body;
  }
  return {...runtime,base,post};
}
async function imported(post,product,category='tops',photo=png,gender='Mixte') {
  return post('/import',{product,variant:'v1',name:product,color:'Référence',category,gender,quality:{hanger:'present'},photo:'data:image/png;base64,'+photo.toString('base64')},201);
}
const tryInput=state=>({session:state.session,revision:state.revision,requestId:randomUUID()});

test('Schéma Runware multi-références standard et polling sans paramètres Pruna directs',async t=>{
  const person={mime:'image/png',bytes:Buffer.from('person-original')};
  const garments=[{mime:'image/png',bytes:Buffer.from('top-original')},{mime:'image/png',bytes:Buffer.from('bottom-original')}];
  const task=buildRunwareTask(person,garments);
  assert.equal(task.model,'prunaai:p-image@try-on');
  assert.deepEqual(task.inputs.referenceImages.map(item=>item.role),['person','garment','garment']);
  assert.deepEqual(task.settings,{turbo:false,preserveInputSize:true});
  for(const forbidden of ['person_image','garment_images','turbo','preserve_input_size'])assert.equal(task[forbidden],undefined);
  assert.equal(task.numberResults,1);assert.equal(task.includeCost,true);
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(String(url),'https://api.runware.ai/v1');
    assert.equal(options.headers.Authorization,'Bearer mock-key');
    const [body]=JSON.parse(options.body);calls.push(body);
    return Response.json({data:[calls.length===1?{taskUUID:task.taskUUID,status:'processing'}:{taskUUID:task.taskUUID,imageDataURI:'data:image/png;base64,'+png.toString('base64'),cost:0.023}]});
  });
  const output=await runwareTryOn(task,'mock-key',{pollMs:0});
  assert.deepEqual(output.bytes,png);assert.equal(output.costMicros,23000);
  assert.equal(calls.length,2);assert.equal(calls[1].taskType,'getResponse');
});

test('Aucune relance automatique de génération après une erreur HTTP',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:502});});
  const image={mime:'image/png',bytes:png};
  await assert.rejects(runwareTryOn(buildRunwareTask(image,[image]),'mock'),/HTTP 502/);
  assert.equal(calls,1);
});

test('Sélection par emplacement, robe, couche intermédiaire et extérieur indépendants',()=>{
  let selected={};
  for(const [id,category] of [['shirt','tops'],['hoodie','top-layers'],['coat','outerwear'],['pants','bottoms']])selected=choosePiece(selected,{id,category});
  selected=choosePiece(selected,{id:'new-pants',category:'bottoms'});
  assert.equal(selected.tops,'shirt');assert.equal(selected['top-layers'],'hoodie');assert.equal(selected.outerwear,'coat');
  selected=choosePiece(selected,{id:'dress',category:'dresses'});
  assert.deepEqual(selected,{outerwear:'coat',dresses:'dress'});
});

test('Plafond monétaire persistant, magasin différent et coupure si le tarif réel dépasse la réserve',()=>{
  const filename=resolve(temporary(),'pilot.sqlite');
  let database=new RunwareStore(filename,'a');
  assert.throws(()=>database.reserve('locked',{}, {authorized:false,keyConfigured:true}),/verrouillé/);
  for(let i=0;i<12;i++)database.reserve(String(i),{}, {authorized:true,keyConfigured:true});
  database.close();database=new RunwareStore(filename,'b');
  assert.equal(database.costs().reserved,480000);
  assert.throws(()=>database.reserve('over',{}, {authorized:true,keyConfigured:true}),/Plafond/);
  database.close();
  database=new RunwareStore(resolve(temporary(),'other.sqlite'),'a');
  const {id}=database.reserve('first',{}, {authorized:true,keyConfigured:true});
  database.finish(id,png,41000);
  assert.throws(()=>database.reserve('next',{}, {authorized:true,keyConfigured:true}),/Coût fournisseur/);
  database.close();
});

test('Clé seule verrouillée, produit importé sélectionnable et images arbitraires refusées',async t=>{
  let calls=0;
  const {base,post}=await start(t,{authorized:false,transport:async()=>{calls++;throw Error('Ne doit pas être appelé');}});
  const item=await imported(post,'nouvel-id');
  assert.ok(item.quality.warnings.some(warning=>warning.includes('Cintre')));
  let state=await post('/session',{gender:'Femme'},201);
  state=await post('/selection',{...tryInput(state),id:item.id});
  assert.equal(state.selected[0].id,item.id);assert.equal(state.ability.available,false);
  await post('/try',tryInput(state),403);assert.equal(calls,0);
  await post('/import',{product:'x',variant:'v',name:'x',color:'x',category:'tops',gender:'Mixte',photo:'https://example.com/arbitrary.png'},400);
  for(const path of ['/','/catalog','/audit','/runware-ui.js','/.env.runware.local'])assert.ok(!(await(await fetch(base+path)).text()).includes('mock-key-never-real'));
});

test('Déduplication, résultat obsolète, originales complètes à chaque appel et changement de photo',async t=>{
  const tasks=[];let release,observed;
  const gate=new Promise(resolve=>{release=resolve;});
  const started=new Promise(resolve=>{observed=resolve;});
  const {post,base,database}=await start(t,{transport:async task=>{
    tasks.push(task);if(tasks.length===1){observed();await gate;}
    return {bytes:png,costMicros:23000};
  }});
  const top=await imported(post,'hoodie','top-layers');
  const dune=await imported(post,'dune','bottoms');
  const rivage=await imported(post,'rivage','bottoms');
  let state=await post('/session',{gender:'Femme'},201);
  state=await post('/selection',{...tryInput(state),id:top.id});
  state=await post('/selection',{...tryInput(state),id:dune.id});
  const first=post('/try',tryInput(state),409);await started;
  const duplicate=post('/try',tryInput(state),409);
  state=await post('/selection',{...tryInput(state),id:rivage.id});
  release();await Promise.all([first,duplicate]);assert.equal(tasks.length,1);
  const output=await post('/try',tryInput(state));assert.equal(tasks.length,2);
  const expectedPerson=readFileSync(resolve(here,'../../public/images/fitting/mannequin-femme.webp')).toString('base64');
  for(const task of tasks) {
    assert.equal(task.inputs.referenceImages[0].image,'data:image/webp;base64,'+expectedPerson);
    assert.equal(task.inputs.referenceImages.length,3);
  }
  assert.equal(output.selected.length,2);
  const cached=await post('/try',tryInput(state));assert.equal(cached.cached,true);assert.equal(tasks.length,2);
  const changed=await sharp(png).tint('#8b3030').png().toBuffer();
  const updated=await imported(post,'rivage','bottoms',changed);assert.equal(updated.id,rivage.id);
  await post('/try',tryInput(state),409);
  state=await(await fetch(base+'/state?session='+state.session)).json();
  await post('/try',tryInput(state));assert.equal(tasks.length,3);
  assert.ok(tasks[2].inputs.referenceImages.some(item=>item.image==='data:image/png;base64,'+changed.toString('base64')));
  assert.equal(database.audit().length,3);
  state=await post('/selection',{...tryInput(state),gender:'Homme'});assert.equal(state.selected.length,0);
  await post('/exit',{session:state.session});
  await post('/selection',{...tryInput(state),id:top.id},410);
});

test('Sortie de page pendant un calcul — sortie conservée en cache, session terminée',async t=>{
  let release,observed;
  const gate=new Promise(resolve=>{release=resolve;});const started=new Promise(resolve=>{observed=resolve;});
  const {post,database}=await start(t,{transport:async()=>{observed();await gate;return {bytes:png,costMicros:15000};}});
  const item=await imported(post,'single');
  let state=await post('/session',{gender:'Homme'},201);
  state=await post('/selection',{...tryInput(state),id:item.id});
  const request=post('/try',tryInput(state),409);await started;
  await post('/exit',{session:state.session});release();await request;
  assert.equal(database.audit()[0].state,'completed');
  await post('/try',tryInput(state),410);
});

test('Réservations concurrentes partagées entre magasins — douze appels au maximum',async()=>{
  const filename=resolve(temporary(),'pilot.sqlite');new RunwareStore(filename,'init').close();
  const counts=await Promise.all(Array.from({length:4},(_,index)=>new Promise((accept,reject)=>{
    const worker=new Worker(`
      const {workerData,parentPort}=require('node:worker_threads');
      import(workerData.module).then(({RunwareStore})=>{
        const database=new RunwareStore(workerData.filename,String(workerData.index));let count=0;
        for(let i=0;i<4;i++)try{database.reserve(String(i),{}, {authorized:true,keyConfigured:true});count++;}
        catch(error){if(error.status!==403)throw error;}
        database.close();parentPort.postMessage(count);
      });
    `,{eval:true,workerData:{filename,index,module:new URL('runware-store.mjs',import.meta.url).href}});
    worker.once('message',accept);worker.once('error',reject);
  })));
  assert.equal(counts.reduce((sum,count)=>sum+count,0),12);
  const database=new RunwareStore(filename,'check');assert.equal(database.costs().reserved,480000);database.close();
});

test('Les neuf parcours du plan repartent du mannequin fixe et de toutes les variantes originales, protocole simulé',async t=>{
  const tasks=[];
  const {base,database}=await start(t,{transport:async task=>{tasks.push(task);return {bytes:png,costMicros:23000};}});
  const root=temporary(),lab=resolve(root,'prototypes/try-on');mkdirSync(lab,{recursive:true});
  for(const name of ['verify-runware.mjs','runware-plan.json','runware-store.mjs','runware-domain.mjs'])copyFileSync(resolve(here,name),resolve(lab,name));
  const plan=JSON.parse(readFileSync(resolve(here,'runware-plan.json'),'utf8'));
  for(const item of plan.variants) {
    const filename=resolve(root,'public',item.file);mkdirSync(resolve(filename,'..'),{recursive:true});
    copyFileSync(resolve(here,'../../public',item.file),filename);
  }
  const output=await new Promise((accept,reject)=>{
    const runner=spawn(process.execPath,[resolve(lab,'verify-runware.mjs')],{env:{...process.env,RUNWARE_TEST_URL:base},stdio:['ignore','pipe','pipe']});
    let log='';runner.stdout.on('data',chunk=>{log+=chunk;});runner.stderr.on('data',chunk=>{log+=chunk;});
    runner.once('error',reject);runner.once('exit',code=>accept({code,log}));
  });
  assert.equal(output.code,0,output.log);
  const manifest=JSON.parse(readFileSync(resolve(lab,'evidence/runware-standard/manifest.json'),'utf8'));
  assert.equal(manifest.cases.length,9);assert.equal(tasks.length,9);
  const jobs=database.audit();assert.equal(jobs.length,9);
  for(const [index,task] of tasks.entries()) {
    const inputs=task.inputs.referenceImages;
    assert.equal(digest(Buffer.from(inputs[0].image.split(',')[1],'base64')),jobs[index].metadata.mannequin);
    assert.deepEqual(inputs.slice(1).map(item=>digest(Buffer.from(item.image.split(',')[1],'base64'))),jobs[index].metadata.variants.map(item=>item.hash));
    assert.equal(task.settings.turbo,false);
  }
  assert.ok(manifest.cases.every(item=>item.quality==='pending_real_visual_inspection'));
  assert.equal(manifest.quality,'pending_real_visual_inspection');
});
