const demo = 'https://fashn-ai-fashn-vton-1-5.hf.space/gradio_api';
const api = 'https://api.fashn.ai/v1';
export const generationProfiles = {
  free: ['fashn-vton-1.5-demo','flat-lay',20,1.5,42,true],
  fashn: ['tryon-v1.6','flat-lay','balanced',42,1,'png']
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options, redirect: 'error', signal: options.signal ?? AbortSignal.timeout(25_000)
  });
  if (!response.ok) throw Error(`Moteur distant : HTTP ${response.status}.`);
  return response;
}

async function json(url, body, key, signal) {
  return (await request(url, {
    method: body ? 'POST' : 'GET',
    signal,
    headers: {...(body ? {'Content-Type':'application/json'} : {}), ...(key ? {Authorization:`Bearer ${key}`} : {})},
    body: body ? JSON.stringify(body) : undefined
  })).json();
}

async function upload(bytes) {
  const form = new FormData();
  form.append('files', new Blob([bytes],{type:'image/png'}), 'reference.png');
  const [path] = await (await request(demo+'/upload',{method:'POST',body:form})).json();
  if (typeof path !== 'string') throw Error('Envoi refusé par le démonstrateur.');
  return {path, meta:{_type:'gradio.FileData'}};
}

export async function freeTryOn(person, garment, category) {
  const images = await Promise.all([upload(person),upload(garment)]);
  const [, ...profile] = generationProfiles.free;
  const job = await json(demo+'/call/try_on',{data:[...images,category,...profile]});
  if (!job.event_id) throw Error('Pas de tâche créée par le démonstrateur.');
  const stream = await request(demo+'/call/try_on/'+encodeURIComponent(job.event_id),{signal:AbortSignal.timeout(150_000)});
  const events = (await stream.text()).split(/\r?\n\r?\n/);
  const result = events.find(event=>event.startsWith('event: complete'));
  if (!result) {
    const error = events.find(event=>event.startsWith('event: error'))?.split('data: ')[1];
    throw Error('Démonstrateur gratuit indisponible pour cet essai'+(error && error!=='null' ? ': '+error.slice(0,240) : '.'));
  }
  const [file] = JSON.parse(result.split('data: ')[1]);
  const url = new URL(file.url);
  if (url.origin !== new URL(demo).origin || !url.pathname.startsWith('/gradio_api/file=')) throw Error('Adresse de sortie inattendue.');
  return Buffer.from(await (await request(url)).arrayBuffer());
}

export async function hostedTryOn(person, garment, category, key, onJob=()=>{}) {
  const asImage = image=>`data:image/png;base64,${image.toString('base64')}`;
  const [model_name,garment_photo_type,mode,seed,num_samples,output_format]=generationProfiles.fashn;
  const job = await json(api+'/run',{
    model_name,
    inputs:{model_image:asImage(person),garment_image:asImage(garment),category,
      garment_photo_type,mode,seed,num_samples,output_format,return_base64:true}
  },key);
  if (!job.id || job.error) throw Error('FASHN a refusé la création de la tâche.');
  onJob(job.id);
  const deadline=Date.now()+85_000;
  while(Date.now()+3000<deadline) {
    await new Promise(resolve=>setTimeout(resolve,2000));
    const state = await json(api+'/status/'+encodeURIComponent(job.id),undefined,key,AbortSignal.timeout(Math.min(10_000,deadline-Date.now())));
    if (state.status==='failed') {
      const error=new Error(`Échec FASHN (${String(state.error?.name ?? 'inconnu').slice(0,80)}).`);
      error.remoteFailed=true;
      throw error;
    }
    if (state.status==='completed') {
      const data = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(state.output?.[0] ?? '');
      if (!data) throw Error('Format de résultat FASHN inattendu.');
      return {image:Buffer.from(data[1],'base64'),jobId:job.id};
    }
  }
  throw Error('Délai de génération dépassé. La tâche distante peut encore aboutir.');
}
