import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
import {PaidLedger} from './paid-ledger.mjs';
import {hostedTryOn} from './providers.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(resolve(here,'.data'),{recursive:true});
const temporary=()=>mkdtempSync(resolve(here,'.data/pilot-test-'));

test('Le verrou refuse une clé seule, un budget supérieur à 10 et la onzième réservation',()=>{
  const filename=resolve(temporary(),'credits.sqlite');
  let ledger=new PaidLedger(filename);
  const input={authorized:true,keyConfigured:true,budget:10,store:'a',renderId:'render',inputs:{}};
  assert.throws(()=>ledger.reserve({...input,authorized:false}),/verrouillé/);
  assert.throws(()=>ledger.reserve({...input,budget:11}),/10 crédits/);
  assert.equal(ledger.reserved(),0);
  for(let i=0;i<10;i++)ledger.reserve({...input,store:String(i),renderId:String(i)});
  ledger.close();
  ledger=new PaidLedger(filename);
  assert.equal(ledger.reserved(),10);
  assert.throws(()=>ledger.reserve({...input,store:'nouveau',renderId:'onzieme'}),/Plafond/);
  ledger.close();
});

test('Une issue incertaine conserve sa réservation et empêche un doublon automatique',()=>{
  const ledger=new PaidLedger(resolve(temporary(),'credits.sqlite'));
  const input={authorized:true,keyConfigured:true,budget:10,store:'a',renderId:'same',inputs:{person:'hash'}};
  const id=ledger.reserve(input);
  ledger.submitted(id,'job-test');
  ledger.finish(id,'unknown','Délai dépassé');
  assert.equal(ledger.reserved(),1);
  assert.equal(ledger.list()[0].job_id,'job-test');
  assert.throws(()=>ledger.reserve(input),/déjà réservé/);
  ledger.close();
});

test('Quatre processus concurrents partagent un plafond global de 10 crédits',async()=>{
  const filename=resolve(temporary(),'credits.sqlite');
  new PaidLedger(filename).close();
  const counts=await Promise.all(Array.from({length:4},(_,index)=>new Promise((accept,reject)=>{
    const worker=new Worker(`
      const {parentPort,workerData}=require('node:worker_threads');
      import(workerData.module).then(({PaidLedger})=>{
        const ledger=new PaidLedger(workerData.filename);let count=0;
        for(let i=0;i<4;i++)try {
          ledger.reserve({authorized:true,keyConfigured:true,budget:10,store:String(workerData.index),renderId:String(i),inputs:{}});count++;
        } catch(error) {if(error.status!==403)throw error;}
        ledger.close();parentPort.postMessage(count);
      }).catch(error=>{throw error;});
    `,{eval:true,workerData:{filename,index,module:new URL('paid-ledger.mjs',import.meta.url).href}});
    worker.once('message',accept);worker.once('error',reject);
  })));
  assert.equal(counts.reduce((sum,count)=>sum+count,0),10);
  const ledger=new PaidLedger(filename);
  assert.equal(ledger.reserved(),10);
  ledger.close();
});

test('Adaptateur FASHN — un résultat, paramètres fixes et identifiant conservé, réseau simulé',async t=>{
  const calls=[];
  const bytes=Buffer.from('provider-output-test');
  const nativeTimeout=globalThis.setTimeout;
  t.mock.method(globalThis,'setTimeout',callback=>nativeTimeout(callback,0));
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push(String(url));
    assert.equal(new URL(url).origin,'https://api.fashn.ai');
    assert.equal(options.headers.Authorization,'Bearer test-only');
    if(String(url).endsWith('/run')) {
      const body=JSON.parse(options.body);
      assert.equal(body.model_name,'tryon-v1.6');
      assert.equal(body.inputs.num_samples,1);
      assert.equal(body.inputs.return_base64,true);
      return Response.json({id:'job-test'});
    }
    return Response.json({status:'completed',output:['data:image/png;base64,'+bytes.toString('base64')]});
  });
  let recorded;
  const result=await hostedTryOn(Buffer.from('person'),Buffer.from('garment'),'tops','test-only',id=>{recorded=id;});
  assert.equal(recorded,'job-test');
  assert.equal(result.jobId,'job-test');
  assert.deepEqual(result.image,bytes);
  assert.equal(calls.filter(url=>url.endsWith('/run')).length,1);
});

test('Protocole complet simulé — verrou, cinq cas, six crédits, sorties brutes et clé absente du navigateur',async t=>{
  const root=temporary();
  const lab=resolve(root,'prototypes/try-on');
  mkdirSync(lab,{recursive:true});
  for(const name of ['server.mjs','providers.mjs','paid-ledger.mjs','verify-fashn-pilot.mjs','index.html','ui.js','style.css'])copyFileSync(resolve(here,name),resolve(lab,name));
  const wardrobe=resolve(root,'components/fitting/wardrobe.ts');
  mkdirSync(dirname(wardrobe),{recursive:true});
  copyFileSync(resolve(here,'../../components/fitting/wardrobe.ts'),wardrobe);
  const fixture=await sharp({create:{width:16,height:24,channels:3,background:'#d3cabb'}}).webp().toBuffer();
  for(const name of ['images/fitting/mannequin-femme.webp',...[0,1,3,12,14,15].map(index=>'images/catalog/product-'+String(index).padStart(2,'0')+'-front.webp')]) {
    const filename=resolve(root,'public',name);mkdirSync(dirname(filename),{recursive:true});writeFileSync(filename,fixture);
  }
  const png=await sharp(fixture).png().toBuffer();
  const preload=resolve(root,'mock-network.mjs');
  writeFileSync(preload,`let calls=0;globalThis.fetch=async(url,options)=>{
    if(new URL(url).origin!=='https://api.fashn.ai')throw Error('Réseau externe interdit dans ce test');
    if(String(url).endsWith('/run')){calls++;return Response.json({id:'mock-'+calls});}
    return Response.json({status:'completed',output:['data:image/png;base64,${png.toString('base64')}']});
  };`);
  const port=3299;
  const environment={...process.env,VTON_PROVIDER:'fashn',FASHN_API_KEY:'test-key-never-real',VTON_BUDGET_CREDITS:'10',VTON_PAID_AUTHORIZED:'0',VTON_PORT:String(port),VTON_REPLAY_EVIDENCE:'',VTON_STORE_ID:'test',VTON_DATA_DIR:resolve(root,'catalog'),VTON_RUNS_PER_DAY:'10'};
  async function start(authorized) {
    const child=spawn(process.execPath,['--import',pathToFileURL(preload).href,resolve(lab,'server.mjs')],{env:{...environment,VTON_PAID_AUTHORIZED:authorized},stdio:['ignore','pipe','pipe']});
    t.after(()=>{child.kill();});
    await new Promise((accept,reject)=>{
      child.once('error',reject);
      child.once('exit',code=>reject(Error('Serveur de test arrêté '+code)));
      child.stdout.on('data',chunk=>{if(String(chunk).includes('Prototype :'))accept();});
    });
    return child;
  }
  const base='http://127.0.0.1:'+port;
  let server=await start('0');
  const refused=await fetch(base+'/try',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids:['alpine']})});
  assert.equal(refused.status,503);
  assert.equal((await(await fetch(base+'/pilot-status')).json()).reserved,0);
  for(const path of ['/','/catalog','/ui.js','/pilot-status','/.env.fashn-pilot.local'])assert.ok(!(await(await fetch(base+path)).text()).includes(environment.FASHN_API_KEY));
  await new Promise(accept=>{server.once('exit',accept);server.kill();});
  server=await start('1');
  const result=await new Promise((accept,reject)=>{
    const runner=spawn(process.execPath,[resolve(lab,'verify-fashn-pilot.mjs')],{env:{...environment,VTON_TEST_URL:base},stdio:['ignore','pipe','pipe']});
    let output='';runner.stdout.on('data',chunk=>{output+=chunk;});runner.stderr.on('data',chunk=>{output+=chunk;});
    runner.once('error',reject);runner.once('exit',code=>accept({code,output}));
  });
  assert.equal(result.code,0,result.output);
  const manifest=JSON.parse(readFileSync(resolve(lab,'evidence/fashn-pilot/manifest.json'),'utf8'));
  assert.equal(manifest.cases.length,5);
  assert.ok(manifest.cases.every(item=>item.status===200&&item.quality==='pending_inspection'));
  assert.equal(manifest.reservedCredits,6);
  assert.equal(manifest.attempts.length,6);
  assert.equal(manifest.quality,'pending_inspection');
  assert.equal(readdirSync(resolve(lab,'evidence/fashn-pilot')).filter(name=>name.endsWith('-raw.png')).length,6);
  for(const attempt of manifest.attempts)assert.deepEqual(readFileSync(resolve(lab,'evidence/fashn-pilot',attempt.id+'-raw.png')),png);
  assert.ok(!JSON.stringify(manifest).includes(environment.FASHN_API_KEY));
});
