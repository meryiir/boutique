import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export const PILOT_CREDIT_CAP=10;
function refuse(message) {
  const error=new Error(message);
  error.status=403;
  throw error;
}

export class PaidLedger {
  constructor(filename) {
    mkdirSync(dirname(filename),{recursive:true});
    this.db=new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, store TEXT, render_id TEXT, created INTEGER,
        credits INTEGER, state TEXT, job_id TEXT, inputs TEXT, error TEXT
      );
    `);
  }
  reserved() {
    return this.db.prepare('SELECT coalesce(sum(credits),0) AS total FROM attempts').get().total;
  }
  reserve({authorized,keyConfigured,budget,store,renderId,inputs}) {
    if(!authorized || !keyConfigured)refuse('Pilote payant verrouillé. Autorisation explicite et clé serveur requises.');
    if(!Number.isSafeInteger(budget)||budget<1||budget>PILOT_CREDIT_CAP)refuse('Le budget du pilote doit être compris entre 1 et 10 crédits.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(this.reserved()+1>budget)refuse('Plafond cumulé du pilote atteint. Aucune génération supplémentaire autorisée.');
      const previous=this.db.prepare("SELECT id FROM attempts WHERE store=? AND render_id=? AND state IN ('reserved','submitted','completed','unknown','output-error')").get(store,renderId);
      if(previous)refuse('Ce calcul est déjà réservé ou terminé. Vérifiez son journal avant toute nouvelle tentative.');
      const id=randomUUID();
      this.db.prepare('INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id,store,renderId,Date.now(),1,'reserved',null,JSON.stringify(inputs),null);
      this.db.exec('COMMIT');
      return id;
    } catch(error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  submitted(id,jobId) {
    this.db.prepare("UPDATE attempts SET state='submitted',job_id=? WHERE id=?").run(jobId,id);
  }
  finish(id,state,error=null) {
    this.db.prepare('UPDATE attempts SET state=?,error=? WHERE id=?').run(state,error,id);
  }
  list() {
    return this.db.prepare('SELECT * FROM attempts ORDER BY created,id').all().map(row=>({...row,inputs:JSON.parse(row.inputs)}));
  }
  close() {this.db.close();}
}
