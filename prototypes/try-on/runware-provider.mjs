import {randomUUID} from 'node:crypto';

export const RUNWARE_MODEL='prunaai:p-image@try-on';
export const STANDARD_SETTINGS={turbo:false,preserveInputSize:true};
const endpoint='https://api.runware.ai/v1';
export const mannequinPrompt='Keep the original ivory plastic retail mannequin, its featureless plastic head, hands, body proportions, pose and background. Dress it in every supplied garment reference, preserving colors, prints, seams, sleeves and lengths. Remove product hangers and product backgrounds from the transferred clothing.';

export function buildRunwareTask(person,garments,taskUUID=randomUUID()) {
  if(!garments.length||garments.length>3)throw Error('Le pilote standard accepte une à trois pièces par calcul.');
  const asImage=image=>`data:${image.mime};base64,${image.bytes.toString('base64')}`;
  return {
    taskType:'imageInference',taskUUID,model:RUNWARE_MODEL,
    numberResults:1,outputType:'dataURI',outputFormat:'PNG',includeCost:true,
    seed:42,positivePrompt:mannequinPrompt,settings:{...STANDARD_SETTINGS},
    inputs:{referenceImages:[{image:asImage(person),role:'person'},...garments.map(image=>({image:asImage(image),role:'garment'}))]}
  };
}

export async function runwareTryOn(task,key,{timeoutMs=150000,pollMs=2000}={}) {
  const deadline=Date.now()+timeoutMs;
  async function send(body) {
    const response=await fetch(endpoint,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(125000,deadline-Date.now()))),
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify([body])
    });
    if(!response.ok)throw Error(`Runware HTTP ${response.status}. La tâche peut être incertaine, aucun nouvel envoi automatique.`);
    const result=await response.json();
    if(result.errors?.length) {
      const error=new Error('Runware a refusé la tâche ('+String(result.errors[0].code ?? 'inconnu').slice(0,100)+').');
      error.definitive=true;
      throw error;
    }
    const row=result.data?.find(item=>item.taskUUID===task.taskUUID);
    if(!row)throw Error('Réponse Runware sans identifiant correspondant.');
    return row;
  }
  let row=await send(task);
  while(!row.imageDataURI&&!row.imageBase64Data) {
    if(Date.now()+pollMs>=deadline)throw Error('Délai Runware dépassé. La tâche reste réservée pour éviter une double facturation.');
    await new Promise(resolve=>setTimeout(resolve,pollMs));
    row=await send({taskType:'getResponse',taskUUID:task.taskUUID});
  }
  const base64=row.imageBase64Data ?? /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(row.imageDataURI)?.[1];
  if(!base64)throw Error('Sortie PNG Runware inattendue.');
  if(typeof row.cost!=='number'||!Number.isFinite(row.cost)||row.cost<0)throw Error('Coût Runware absent, vérification nécessaire avant de poursuivre.');
  return {bytes:Buffer.from(base64,'base64'),costMicros:Math.ceil(row.cost*1000000),taskUUID:task.taskUUID,imageUUID:row.imageUUID};
}
