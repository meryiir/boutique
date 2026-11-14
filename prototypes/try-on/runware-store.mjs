import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fail} from './runware-domain.mjs';

export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const RUNWARE_LIMIT={micros:500000,requests:12,reservation:40000};
export class RunwareStore {
  constructor(filename,store) {
    this.store=store;
    mkdirSync(dirname(filename),{recursive:true});
    this.db=new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS rw_photos (store TEXT,hash TEXT,mime TEXT,image BLOB,PRIMARY KEY(store,hash));
      CREATE TABLE IF NOT EXISTS rw_catalog (store TEXT,id TEXT,product TEXT,variant TEXT,name TEXT,gender TEXT,category TEXT,color TEXT,hash TEXT,quality TEXT,PRIMARY KEY(store,id));
      CREATE TABLE IF NOT EXISTS rw_jobs (id TEXT PRIMARY KEY,store TEXT,cache_key TEXT,created INTEGER,state TEXT,reserved INTEGER,actual INTEGER,metadata TEXT,image BLOB,error TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS rw_active_job ON rw_jobs(store,cache_key) WHERE state!='failed';
    `);
  }
  catalog() {
    return this.db.prepare('SELECT id,product,variant,name,gender,category,color,hash,quality FROM rw_catalog WHERE store=? ORDER BY name,color').all(this.store).map(row=>({...row,quality:JSON.parse(row.quality)}));
  }
  item(id) {return this.catalog().find(item=>item.id===id);}
  photo(hash) {
    const photo=this.db.prepare('SELECT mime,image FROM rw_photos WHERE store=? AND hash=?').get(this.store,hash);
    if(!photo)fail('Photo hors du catalogue autorisé.');
    return {mime:photo.mime,bytes:Buffer.from(photo.image)};
  }
  saveReference(person) {
    this.db.prepare('INSERT OR IGNORE INTO rw_photos VALUES (?,?,?,?)').run(this.store,person.hash,person.mime,person.bytes);
  }
  import(item,bytes,quality) {
    const id=digest(JSON.stringify([this.store,item.product,item.variant]));
    const hash=digest(bytes);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT OR IGNORE INTO rw_photos VALUES (?,?,?,?)').run(this.store,hash,quality.mime,bytes);
      this.db.prepare('INSERT OR REPLACE INTO rw_catalog VALUES (?,?,?,?,?,?,?,?,?,?)').run(this.store,id,item.product,item.variant,item.name,item.gender,item.category,item.color,hash,JSON.stringify(quality));
      this.db.exec('COMMIT');
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
    return this.item(id);
  }
  costs() {
    const row=this.db.prepare('SELECT count(*) AS requests,coalesce(sum(max(reserved,coalesce(actual,0))),0) AS reserved,coalesce(sum(actual),0) AS measured,coalesce(max(actual),0) AS maximum FROM rw_jobs').get();
    return {...row,limitMicros:RUNWARE_LIMIT.micros,limitRequests:RUNWARE_LIMIT.requests};
  }
  find(key) {return this.db.prepare("SELECT * FROM rw_jobs WHERE store=? AND cache_key=? AND state!='failed'").get(this.store,key);}
  reserve(key,metadata,{authorized,keyConfigured}) {
    if(!authorized||!keyConfigured)fail('Pilote Runware verrouillé. Clé serveur et autorisation de budget requises.',403);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing=this.find(key);
      if(existing){this.db.exec('COMMIT');return {existing};}
      const costs=this.costs();
      if(costs.maximum>RUNWARE_LIMIT.reservation)fail('Coût fournisseur supérieur à la réserve prévue. Réévaluer le tarif avant de poursuivre.',403);
      if(costs.requests>=RUNWARE_LIMIT.requests||costs.reserved+RUNWARE_LIMIT.reservation>RUNWARE_LIMIT.micros)fail('Plafond Runware atteint. Aucun nouvel appel autorisé.',403);
      const id=randomUUID();
      this.db.prepare('INSERT INTO rw_jobs VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,this.store,key,Date.now(),'reserved',RUNWARE_LIMIT.reservation,null,JSON.stringify(metadata),null,null);
      this.db.exec('COMMIT');
      return {id};
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
  }
  finish(id,image,cost) {this.db.prepare("UPDATE rw_jobs SET state='completed',image=?,actual=? WHERE id=?").run(image,cost,id);}
  failed(id,error) {this.db.prepare('UPDATE rw_jobs SET state=?,error=? WHERE id=?').run(error.definitive?'failed':'unknown',error.message,id);}
  job(id) {return this.db.prepare('SELECT * FROM rw_jobs WHERE store=? AND id=?').get(this.store,id);}
  audit() {return this.db.prepare('SELECT id,cache_key,created,state,reserved,actual,metadata,error FROM rw_jobs WHERE store=? ORDER BY created').all(this.store).map(row=>({...row,metadata:JSON.parse(row.metadata)}));}
  close(){this.db.close();}
}
