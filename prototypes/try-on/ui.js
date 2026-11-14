const outfit=document.querySelector('#outfit');
const upload=document.querySelector('#import');
const result=document.querySelector('#result');
const title=document.querySelector('#preview-title');
const status=document.querySelector('#status');
const error=document.querySelector('#error');
const worn=document.querySelector('#worn');
const selects=[...outfit.querySelectorAll('select')];
let catalog=[];
let running=false;
let selecting=false;
let selectionSequence=0;
let renderedIds=[];
let availabilitySequence=0;
const calculate=outfit.querySelector('button');

async function refreshAvailability(){
  const ticket=++availabilitySequence;
  calculate.disabled=true;
  try {
    const ready=await api('/availability?ids='+encodeURIComponent(JSON.stringify(selection().map(item=>item.id))));
    if(ticket!==availabilitySequence || running)return;
    calculate.disabled=!ready.available;
    calculate.textContent=ready.available?'Calculer l’aperçu':'Calcul indisponible';
    document.querySelector('#availability').textContent=ready.reason || (ready.experimental?'Composition expérimentale. La fidélité des deux vêtements après les passages successifs reste à vérifier.':'');
  } catch(failure){
    if(ticket===availabilitySequence)document.querySelector('#availability').textContent=failure.message;
  }
}

async function api(path,data){
  const response=await fetch(path,data===undefined ? undefined : {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
  });
  const payload=await response.json();
  if(!response.ok)throw Error(payload.error);
  return payload;
}
const selection=()=>selects.map(select=>catalog.find(item=>item.id===select.value)).filter(Boolean);

function thumbnails(){
  const pieces=selection();
  const images=pieces.map(item=>{
    const image=new Image();
    image.src='/garment/'+item.id;
    image.alt=item.name+' · '+item.variant;
    return image;
  });
  document.querySelector('#references').replaceChildren(...images);
  document.querySelector('#selected').replaceChildren(...pieces.map(item=>{
    const row=document.createElement('li');
    row.textContent=item.name+' · '+item.variant;
    return row;
  }));
  const same=JSON.stringify(pieces.map(item=>item.id).sort())===JSON.stringify([...renderedIds].sort());
  document.querySelector('#render-state').textContent=same?'':'Dernier rendu affiché. La tenue sélectionnée attend son propre calcul.';
}

async function loadCatalog(){
  const data=await api('/catalog');
  catalog=data.catalog;
  document.querySelector('#engine').textContent={
    off:'Moteur distant désactivé. Les essais déjà calculés restent consultables depuis le cache.',
    free:'FASHN v1.5 · Démonstrateur public gratuit. Les images sélectionnées sont envoyées à Hugging Face.',
    fashn:'FASHN v1.6 · API hébergée avec plafond de crédits côté serveur.'
  }[data.provider];
  for(const select of selects){
    const previous=select.value;
    const items=catalog.filter(item=>item.category===select.name&&item.gender!=='Homme');
    select.replaceChildren(new Option('Aucun article',''),...items.map(item=>new Option(item.name+' · '+item.variant,item.id)));
    if(items.some(item=>item.id===previous))select.value=previous;
  }
}

outfit.addEventListener('change',async event=>{
  if(!selects.includes(event.target))return;
  const ticket=++selectionSequence;
  selecting=true;
  availabilitySequence++;
  calculate.disabled=true;
  try {
    const answer=await api('/selection',{ids:selection().map(item=>item.id),add:event.target.value || undefined});
    if(ticket!==selectionSequence)return;
    for(const select of selects)select.value=answer.ids.find(id=>catalog.find(item=>item.id===id)?.category===select.name) || '';
    thumbnails();
    await refreshAvailability();
  } catch(failure){
    if(ticket===selectionSequence){error.textContent=failure.message;calculate.disabled=true;}
  } finally {
    if(ticket===selectionSequence)selecting=false;
  }
});

outfit.addEventListener('submit',async event=>{
  event.preventDefault();
  if(running||selecting)return;
  running=true;
  const pieces=selection();
  status.textContent='Calcul en cours…';
  error.textContent='';
  for(const control of outfit.elements)control.disabled=true;
  try{
    const answer=await api('/try',{ids:pieces.map(item=>item.id)});
    const next=new Image();
    next.src=answer.image;
    await next.decode();
    result.src=answer.image;
    renderedIds=answer.renderedIds;
    title.textContent=pieces.length===2?'Composition calculée · validation visuelle requise':pieces.length?'Résultat calculé':'Mannequin de référence';
    result.alt=pieces.length?'Essayage calculé des variantes sélectionnées':'Mannequin femme Maison Édit';
    worn.textContent=pieces.length?'Articles du rendu affiché — '+pieces.map(item=>item.name+' · '+item.variant).join(' + '):'';
    thumbnails();
    status.textContent=pieces.length?(answer.calls?`${answer.calls} génération(s) · ${(answer.elapsed/1000).toFixed(1)} s`:'Résultat réutilisé depuis le cache.'):'Tenue retirée.';
  }catch(failure){
    status.textContent='';
    error.textContent=failure.message+' Le dernier rendu reste affiché.';
  }finally{
    running=false;
    for(const control of outfit.elements)control.disabled=false;
    void refreshAvailability();
  }
});

upload.addEventListener('submit',async event=>{
  event.preventDefault();
  const notice=document.querySelector('#import-status');
  const button=upload.querySelector('button');
  button.disabled=true;
  try {
    const fields=Object.fromEntries(new FormData(upload));
    if(fields.photo.size>6_000_000)throw Error('Photo trop lourde (6 Mo maximum).');
    fields.photo=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(Error('Lecture de la photo impossible.'));
      reader.readAsDataURL(fields.photo);
    });
    const {id}=await api('/import',fields);
    await loadCatalog();
    const item=catalog.find(piece=>piece.id===id);
    if(item.gender==='Homme'){notice.textContent='Variante importée. Le prototype utilise le mannequin femme.';return;}
    const select=selects.find(control=>control.name===item.category);
    select.value=id;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    upload.reset();
    notice.textContent='Variante importée.';
  } catch(failure){notice.textContent=failure.message;}
  finally{button.disabled=false;}
});
loadCatalog().then(refreshAvailability).catch(failure=>{calculate.disabled=true;error.textContent=failure.message;});
