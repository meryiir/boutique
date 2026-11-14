import {createServer} from 'node:http';
import {createHash, randomUUID} from 'node:crypto';
import {existsSync,mkdirSync, readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {freeTryOn,hostedTryOn,generationProfiles} from './providers.mjs';
import {addToWardrobe,wardrobeSlots} from '../../components/fitting/wardrobe.ts';
import {PaidLedger,PILOT_CREDIT_CAP} from './paid-ledger.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../public');
const provider=process.env.VTON_PROVIDER ?? 'off';
if (!['off','free','fashn'].includes(provider)) throw Error('VTON_PROVIDER invalide');
const key=process.env.FASHN_API_KEY;
const paidAuthorized=process.env.VTON_PAID_AUTHORIZED==='1';
const store=process.env.VTON_STORE_ID ?? 'maison-edit';
const port=Number(process.env.VTON_PORT ?? 3191);
function limit(name, otherwise) {
  const value=Number(process.env[name] ?? otherwise);
  if(!Number.isSafeInteger(value)||value<0) throw Error(name+' invalide');
  return value;
}
const budget=limit('VTON_BUDGET_CREDITS',0);
if(provider==='fashn' && budget>PILOT_CREDIT_CAP)throw Error('Le plafond strict du pilote FASHN est de 10 crédits.');
const paidDir=resolve(here,'.data/fashn-pilot');
const paidLedger=provider==='fashn'?new PaidLedger(resolve(paidDir,'credits.sqlite')):null;
const maxRuns=limit('VTON_RUNS_PER_DAY',8);
const maxRequests=limit('VTON_REQUESTS_PER_MINUTE',20);
const cost=provider==='fashn'?1:0;
const profile=provider==='fashn'?generationProfiles.fashn:generationProfiles.free;
const [model]=profile;
const slots=['tops','bottoms','one-pieces','outerwear'];
const categories={tops:'T-shirts',bottoms:'Pantalons','one-pieces':'Robes',outerwear:'Vestes'};
const dir=resolve(process.env.VTON_DATA_DIR ?? resolve(here,'.data'));
mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(resolve(dir,'lab.sqlite'));
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS catalog (
    store TEXT, id TEXT, name TEXT, category TEXT, gender TEXT, variant TEXT,
    version TEXT, image BLOB, PRIMARY KEY(store,id)
  );
  CREATE TABLE IF NOT EXISTS renders (
    store TEXT, id TEXT, image BLOB, elapsed INTEGER, PRIMARY KEY(store,id)
  );
  CREATE TABLE IF NOT EXISTS usage (
    store TEXT, time INTEGER, credits INTEGER
  );
`);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const mannequin=await normalize(readFileSync(resolve(root,'images/fitting/mannequin-femme.webp')));
const reference=hash(mannequin);
const renderKey=prefix=>hash(JSON.stringify(['front-v1',profile,reference,prefix]));
const pending=new Map();
let active=0;
const samples=[
  ['alpine','T-shirt Alpine','tops','Mixte','Blanc','images/catalog/product-00-front.webp'],
  ['wild','T-shirt Wild Cards','tops','Mixte','Rose','images/catalog/product-01-front.webp'],
  ['rivage','Pantalon Rivage','bottoms','Mixte','Olive','images/catalog/product-14-front.webp'],
  ['lumiere','Robe Lumière','one-pieces','Femme','Ivoire','images/catalog/product-15-front.webp'],
];
const add=db.prepare('INSERT OR IGNORE INTO catalog VALUES (?,?,?,?,?,?,?,?)');
for(const [id,name,category,gender,variant,path] of samples) {
  const image=await normalize(readFileSync(resolve(root,path)));
  add.run(store,id,name,category,gender,variant,hash(image),image);
}
// Replay only the recorded single-garment runs, using a separate local database.
if(process.env.VTON_REPLAY_EVIDENCE==='1') {
  if(provider!=='off') throw Error('La relecture des essais nécessite VTON_PROVIDER=off.');
  const sentMannequin=await sharp(resolve(root,'images/fitting/mannequin-femme.webp')).flatten({background:'#e5e0d5'}).png().toBuffer();
  for(const [id,filename] of [['alpine','01-haut'],['rivage','02-pantalon'],['lumiere','03-robe']]) {
    const piece=db.prepare('SELECT * FROM catalog WHERE store=? AND id=?').get(store,id);
    const original=samples.find(sample=>sample[0]===id);
    const source=readFileSync(resolve(root,original[5]));
    const sent=await sharp(source).flatten({background:'#e5e0d5'}).png().toBuffer();
    if(hash(sent)!==piece.version||hash(sentMannequin)!==reference) throw Error('Les entrées de l’essai ont changé.');
    db.prepare('INSERT OR IGNORE INTO renders VALUES (?,?,?,?)')
      .run(store,renderKey([[id,piece.variant,piece.category,piece.version]]),readFileSync(resolve(here,'evidence',filename+'.png')),0);
  }
}

async function normalize(bytes) {
  const image=sharp(bytes,{limitInputPixels:16_000_000,failOn:'error'});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1) throw Error('Photo JPEG, PNG ou WebP requise.');
  return image.rotate().resize(864,1296,{fit:'inside',withoutEnlargement:true})
    .flatten({background:'#e5e0d5'}).png().toBuffer();
}

class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
function reserve(renderId,inputs) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const row=db.prepare('SELECT count(*) AS runs FROM usage WHERE store=? AND time>?').get(store,Date.now()-86_400_000);
    if(row.runs>=maxRuns) throw new HttpError(429,'Limite de générations sur 24 h atteinte.');
    const ticket=paidLedger?.reserve({authorized:paidAuthorized,keyConfigured:!!key,budget,store,renderId,inputs});
    db.prepare('INSERT INTO usage VALUES (?,?,?)').run(store,Date.now(),cost);
    db.exec('COMMIT');
    return ticket;
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function compose(pieces) {
  let person=mannequin;
  let prefix=[];
  let calls=0;
  let elapsed=0;
  let id='reference';
  for(const piece of pieces) {
    prefix=[...prefix,[piece.id,piece.variant,piece.category,piece.version]];
    id=renderKey(prefix);
    const cached=db.prepare('SELECT image,elapsed FROM renders WHERE store=? AND id=?').get(store,id);
    if(cached){person=Buffer.from(cached.image);continue;}
    if(provider==='off') throw new HttpError(503,'Aucun moteur activé. Lancez le serveur avec VTON_PROVIDER=free pour le démonstrateur.');
    const previous=person;
    const existing=pending.get(id);
    if(existing){person=await existing;continue;}
    if(active>=1) throw new HttpError(429,'Un essayage est en cours. Réessayez après son résultat.');
    const ticket=reserve(id,{model,profile,mannequin:reference,person:hash(previous),garment:piece.version,category:piece.category,pieces:prefix});
    const renderId=id;
    calls++;
    active++;
    const start=Date.now();
    const task=(async()=>{
      try {
        let raw;
        if(provider==='free')raw=await freeTryOn(previous,piece.image,piece.category);
        else {
          mkdirSync(resolve(paidDir,'inputs'),{recursive:true});
          writeFileSync(resolve(paidDir,'inputs',ticket+'-person.png'),previous);
          writeFileSync(resolve(paidDir,'inputs',ticket+'-garment.png'),piece.image);
          const output=await hostedTryOn(previous,piece.image,piece.category,key,jobId=>paidLedger.submitted(ticket,jobId));
          raw=output.image;
          mkdirSync(resolve(paidDir,'outputs'),{recursive:true});
          writeFileSync(resolve(paidDir,'outputs',ticket+'.png'),raw);
        }
        const image=await normalize(raw);
        const duration=Date.now()-start;
        elapsed+=duration;
        db.prepare('INSERT OR IGNORE INTO renders VALUES (?,?,?,?)').run(store,renderId,image,duration);
        if(ticket)paidLedger.finish(ticket,'completed');
        return image;
      } catch(error) {
        if(ticket)paidLedger.finish(ticket,error.remoteFailed?'failed':existsSync(resolve(paidDir,'outputs',ticket+'.png'))?'output-error':'unknown',error.message);
        throw error;
      } finally {active--;pending.delete(renderId);}
    })();
    pending.set(id,task);
    person=await task;
  }
  return {image:'/image/'+id,calls,elapsed,model};
}

async function body(req) {
  const chunks=[];
  let length=0;
  for await(const chunk of req) {
    length+=chunk.length;
    if(length>8_500_000) throw new HttpError(413,'Photo trop lourde (6 Mo maximum).');
    chunks.push(chunk);
  }
  try{
    const parsed=JSON.parse(Buffer.concat(chunks).toString());
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))throw Error();
    return parsed;
  }
  catch{throw new HttpError(400,'Données invalides.');}
}
function label(value) {
  if(typeof value!=='string'||!value.trim()||value.length>100) throw new HttpError(400,'Nom ou variante invalide.');
  return value.trim();
}
const readPiece=db.prepare('SELECT * FROM catalog WHERE store=? AND id=?');
function readPieces(ids) {
  if(!Array.isArray(ids)||ids.length>8||ids.some(id=>typeof id!=='string')) throw new HttpError(400,'Tenue invalide.');
  const pieces=ids.map(id=>readPiece.get(store,id));
  if(pieces.some(p=>!p||p.gender==='Homme')) throw new HttpError(400,'Article inconnu ou incompatible avec le mannequin femme.');
  return pieces.sort((a,b)=>slots.indexOf(a.category)-slots.indexOf(b.category));
}
function selectOutfit(ids,add,remove) {
  const pieces=readPieces(ids).filter(piece=>piece.id!==remove);
  if(add)pieces.push(...readPieces([add]));
  let wardrobe={};
  for(const piece of pieces)wardrobe=addToWardrobe(wardrobe,{id:piece.id,category:categories[piece.category]},piece.variant);
  return wardrobeSlots.filter(slot=>wardrobe[slot]).map(slot=>wardrobe[slot].productId);
}
function selectedPieces(ids) {
  const pieces=readPieces(ids);
  const normalized=selectOutfit(ids);
  if(normalized.length!==ids.length || ids.some(id=>!normalized.includes(id)))throw new HttpError(400,'La sélection contient des pièces incompatibles ou plusieurs articles du même emplacement.');
  return pieces;
}
function availability(pieces) {
  let prefix=[];
  let missing=0;
  for(const piece of pieces) {
    prefix.push([piece.id,piece.variant,piece.category,piece.version]);
    if(!db.prepare('SELECT 1 FROM renders WHERE store=? AND id=?').get(store,renderKey(prefix)))missing++;
  }
  const runs=db.prepare('SELECT count(*) AS total FROM usage WHERE store=? AND time>?').get(store,Date.now()-86_400_000).total;
  const spent=paidLedger?.reserved() ?? 0;
  let reason='';
  if(pieces.some(piece=>piece.category==='outerwear'))reason='Le rendu des vestes superposées n’est pas pris en charge par ce moteur. La veste reste dans la sélection.';
  else if(missing && provider==='off')reason='Moteur désactivé. Aucun rendu calculé en cache pour cette sélection.';
  else if(missing && cost && (!paidAuthorized || !key || spent+missing*cost>budget))reason='API payante verrouillée. Autorisation explicite, clé serveur et crédits disponibles requis.';
  else if(missing && runs+missing>maxRuns)reason='Limite de générations sur 24 h atteinte pour cette sélection.';
  else if(missing && active)reason='Un essayage est déjà en cours. Réessayez après son résultat.';
  return {available:!reason,reason,missing,experimental:pieces.length===2};
}
function send(res,status,value,type='application/json') {
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(type==='application/json'?JSON.stringify(value):value);
}
const files={'/':['index.html','text/html; charset=utf-8'],'/ui.js':['ui.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
let requests=[];
const server=createServer(async(req,res)=>{
  try {
    if (![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)) throw new HttpError(403,'Hôte non autorisé.');
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname;
    if(req.method==='GET'){
      if(path==='/pilot-status' && paidLedger)return send(res,200,{
        provider,model,authorized:paidAuthorized,keyConfigured:!!key,budget,
        reserved:paidLedger.reserved(),remaining:Math.max(0,budget-paidLedger.reserved()),replay:false,
        attempts:paidLedger.list()
      });
      if(path.startsWith('/pilot-output/') && paidLedger) {
        const ticket=path.slice('/pilot-output/'.length);
        if(paidLedger.list().some(row=>row.id===ticket)&&existsSync(resolve(paidDir,'outputs',ticket+'.png')))
          return send(res,200,readFileSync(resolve(paidDir,'outputs',ticket+'.png')),'image/png');
      }
      const pilotInput=/^\/pilot-input\/([a-f0-9-]+)\/(person|garment)$/.exec(path);
      if(pilotInput && paidLedger && paidLedger.list().some(row=>row.id===pilotInput[1])) {
        const filename=resolve(paidDir,'inputs',pilotInput[1]+'-'+pilotInput[2]+'.png');
        if(existsSync(filename))return send(res,200,readFileSync(filename),'image/png');
      }
      if(path==='/availability') {
        let ids;
        try {ids=JSON.parse(url.searchParams.get('ids') ?? '[]');} catch {throw new HttpError(400,'Tenue invalide.');}
        return send(res,200,availability(selectedPieces(ids)));
      }
      if(Object.hasOwn(files,path)) {const [file,type]=files[path];return send(res,200,readFileSync(resolve(here,file)),type);}
      if(path==='/catalog') return send(res,200,{provider,store,budget,maxRuns,catalog:db.prepare('SELECT id,name,category,gender,variant,version FROM catalog WHERE store=? ORDER BY name,variant').all(store)});
      if(path==='/image/reference') return send(res,200,mannequin,'image/png');
      if(path.startsWith('/garment/')){
        const item=readPiece.get(store,path.slice(9));
        if(item)return send(res,200,Buffer.from(item.image),'image/png');
      }
      if(path.startsWith('/image/')){
        const render=db.prepare('SELECT image FROM renders WHERE store=? AND id=?').get(store,path.slice(7));
        if(render)return send(res,200,Buffer.from(render.image),'image/png');
      }
    }
    if(req.method==='POST'){
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) throw new HttpError(403,'Origine refusée.');
      if(req.headers['content-type']!=='application/json') throw new HttpError(415,'JSON requis.');
      requests=requests.filter(time=>time>Date.now()-60_000);
      if(requests.length>=maxRequests) throw new HttpError(429,`Limite de ${maxRequests} requêtes par minute.`);
      requests.push(Date.now());
      if(path==='/selection') {
        const input=await body(req);
        if(input.add!==undefined&&typeof input.add!=='string' || input.remove!==undefined&&typeof input.remove!=='string')throw new HttpError(400,'Action de sélection invalide.');
        return send(res,200,{ids:selectOutfit(input.ids,input.add,input.remove)});
      }
      if(path==='/import'){
        const input=await body(req);
        const {category,gender}=input;
        if(!slots.includes(category)||!['Femme','Homme','Mixte'].includes(gender)) throw new HttpError(400,'Catégorie ou genre invalide.');
        const name=label(input.name),variant=label(input.variant);
        const valid=/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input.photo ?? '');
        if(!valid)throw new HttpError(400,'Photo JPEG, PNG ou WebP requise.');
        let image;
        try{image=await normalize(Buffer.from(valid[1],'base64'));}catch{throw new HttpError(400,'Photo invalide ou dimensions trop grandes.');}
        const id=randomUUID();
        add.run(store,id,name,category,gender,variant,hash(image),image);
        return send(res,201,{id});
      }
      if(path==='/try'){
        const {ids}=await body(req);
        const pieces=selectedPieces(ids);
        const ready=availability(pieces);
        if(!ready.available)throw new HttpError(503,ready.reason);
        return send(res,200,{...await compose(pieces),renderedIds:pieces.map(piece=>piece.id)});
      }
    }
    send(res,404,{error:'Ressource introuvable.'});
  }catch(error){
    const status=error.status ?? 502;
    console.error('VTON',status,error.message);
    send(res,status,{error:error.message});
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Prototype : http://127.0.0.1:${port} (${provider})`));
