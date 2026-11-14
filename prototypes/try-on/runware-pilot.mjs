import {parseEnv} from 'node:util';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createRunwareServer} from './runware-server.mjs';
import {RunwareStore} from './runware-store.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const filename=resolve(here,'.env.runware.local');
const config=parseEnv(readFileSync(filename,'utf8'));
if(!['0','1'].includes(config.RUNWARE_PAID_AUTHORIZED))throw Error('Autorisation Runware invalide.');
const port=Number(config.RUNWARE_PORT ?? 3201);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port invalide.');
const options={directory:resolve(here,'.data/runware'),authorized:config.RUNWARE_PAID_AUTHORIZED==='1',key:config.RUNWARE_API_KEY?.trim() ?? ''};
const mode=process.argv[2] ?? 'check';
if(mode==='check') {
  const database=new RunwareStore(resolve(options.directory,'pilot.sqlite'),'maison-edit-runware-pilot');
  console.log(JSON.stringify({configFile:filename,keyConfigured:!!options.key,authorized:options.authorized,settings:{turbo:false,preserveInputSize:true},costs:database.costs()},null,2));
  database.close();
} else if(mode==='serve') {
  const {server}=createRunwareServer(options);
  server.listen(port,'127.0.0.1',()=>console.log('Pilote Runware http://127.0.0.1:'+port));
} else if(mode==='run') {
  if(!options.key||!options.authorized)throw Error('Clé et autorisation Runware requises avant tout calcul.');
  process.env.RUNWARE_TEST_URL='http://127.0.0.1:'+port;
  await import('./verify-runware.mjs');
} else throw Error('Utiliser check, serve ou run.');
