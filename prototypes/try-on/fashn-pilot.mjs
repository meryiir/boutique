import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {PaidLedger,PILOT_CREDIT_CAP} from './paid-ledger.mjs';

const configFile=new URL('.env.fashn-pilot.local',import.meta.url);
const config=parseEnv(readFileSync(configFile,'utf8'));
if(!['0','1'].includes(config.VTON_PAID_AUTHORIZED))throw Error('VTON_PAID_AUTHORIZED doit valoir 0 ou 1 dans le fichier local.');
const port=Number(config.VTON_PORT ?? 3199);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port du pilote invalide.');
if(process.env.VTON_REPLAY_EVIDENCE==='1')throw Error('Désactiver la relecture avant de démarrer le pilote FASHN.');
Object.assign(process.env,{
  FASHN_API_KEY:config.FASHN_API_KEY?.trim() ?? '',
  VTON_PAID_AUTHORIZED:config.VTON_PAID_AUTHORIZED,
  VTON_PROVIDER:'fashn',VTON_BUDGET_CREDITS:String(PILOT_CREDIT_CAP),
  VTON_RUNS_PER_DAY:'10',VTON_REQUESTS_PER_MINUTE:'20',VTON_PORT:String(port),
  VTON_STORE_ID:'maison-edit-fashn-pilot',
  VTON_DATA_DIR:fileURLToPath(new URL('.data/fashn-pilot/catalog',import.meta.url)),
  VTON_TEST_URL:`http://127.0.0.1:${port}`
});
const mode=process.argv[2] ?? 'check';
if(mode==='check') {
  const ledger=new PaidLedger(fileURLToPath(new URL('.data/fashn-pilot/credits.sqlite',import.meta.url)));
  console.log(JSON.stringify({
    configFile:fileURLToPath(configFile),keyConfigured:!!process.env.FASHN_API_KEY,
    authorized:config.VTON_PAID_AUTHORIZED==='1',creditCap:PILOT_CREDIT_CAP,
    reservedCredits:ledger.reserved(),remainingCredits:Math.max(0,PILOT_CREDIT_CAP-ledger.reserved())
  },null,2));
  ledger.close();
} else if(mode==='serve') {
  await import('./server.mjs');
} else if(mode==='run') {
  if(config.VTON_PAID_AUTHORIZED!=='1'||!process.env.FASHN_API_KEY)throw Error('Pilote verrouillé. Configurer la clé et obtenir l’autorisation explicite avant de lancer les calculs.');
  await import('./verify-fashn-pilot.mjs');
} else throw Error('Utiliser check, serve ou run.');
