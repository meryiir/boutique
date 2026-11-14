const form=document.querySelector('#outfit');
const upload=document.querySelector('#import');
const result=document.querySelector('#result');
const visualize=document.querySelector('#visualize');
const error=document.querySelector('#error');
const status=document.querySelector('#status');
let catalog=[],categories={},state,rendered=[],closed=false,busy=false;
let generation=0,mutationCount=0,queue=Promise.resolve(),controller;
let lifecycle=0;

async function api(path,data,signal) {
  const response=await fetch(path,data===undefined?{signal}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal});
  const answer=await response.json();
  if(!response.ok)throw Error(answer.error || 'La demande a échoué.');
  return answer;
}
const fingerprint=items=>JSON.stringify(items.map(item=>[item.id,item.hash]).sort((a,b)=>a[0].localeCompare(b[0])));
function stale() {
  document.querySelector('#render-state').textContent=fingerprint(rendered)===fingerprint(state.selected)?'':'Sélection modifiée. Le rendu affiché correspond à la tenue précédente.';
}
function invalidate() {
  generation++;controller?.abort();busy=false;status.textContent='';
}
function paint() {
  if(!state||closed)return;
  document.querySelector('#gender').value=state.gender;
  for(const select of document.querySelectorAll('#slots select')) {
    const options=catalog.filter(item=>item.category===select.name&&['Mixte',state.gender].includes(item.gender));
    select.replaceChildren(new Option('Aucun article',''),...options.map(item=>new Option(item.name+' · '+item.color,item.id)));
    select.value=state.selected.find(item=>item.category===select.name)?.id || '';
  }
  document.querySelector('#selected').replaceChildren(...state.selected.map(item=>{
    const li=document.createElement('li');
    li.textContent=item.name+' · '+item.color;
    const warnings=item.quality.warnings;
    if(warnings.length){const detail=document.createElement('p');detail.textContent=warnings.join(' ');li.append(detail);}
    return li;
  }));
  document.querySelector('#references').replaceChildren(...state.selected.map(item=>{
    const img=new Image();img.src='/garment/'+item.id+'?hash='+item.hash;img.alt=item.name+' · '+item.color;return img;
  }));
  visualize.disabled=busy||mutationCount>0||!state.ability.available;
  document.querySelector('#availability').textContent=state.ability.reason || (state.selected.length?`Estimation standard ${state.ability.estimatedUsd.toFixed(3)} USD. Réserve maximale 0,040 USD par nouveau calcul.`:'');
  stale();
}
async function loadCatalog() {
  const info=await api('/catalog');catalog=info.catalog;categories=info.categories;
  document.querySelector('#engine').textContent=`P-Image-Try-On via Runware · mode standard · ${info.authorized&&info.keyConfigured?'calcul activé':'calcul payant verrouillé'} · réservations ${(info.costs.reserved/1000000).toFixed(3)} / 0,500 USD.`;
  if(!document.querySelector('#slots select'))for(const [slot,name] of Object.entries(categories)) {
    const label=document.createElement('label');label.textContent=name;
    const select=document.createElement('select');select.name=slot;label.append(select);document.querySelector('#slots').append(label);
  }
  const importCategory=document.querySelector('#import-category');
  const previous=importCategory.value;
  importCategory.replaceChildren(...Object.entries(categories).map(([value,name])=>new Option(name,value)));
  if(Object.hasOwn(categories,previous))importCategory.value=previous;
}
async function openSession() {
  const epoch=++lifecycle;
  closed=false;rendered=[];mutationCount=0;queue=Promise.resolve();invalidate();await loadCatalog();
  const next=await api('/session',{gender:'Femme'});
  if(closed||epoch!==lifecycle)return;
  state=next;
  result.src='/mannequin?gender=Femme';document.querySelector('#worn').textContent='';
  document.querySelector('#preview-title').textContent='Mannequin de référence';paint();
}
function mutation(action) {
  const epoch=lifecycle;
  invalidate();mutationCount++;visualize.disabled=true;
  queue=queue.then(async()=>{
    if(closed||epoch!==lifecycle)return;
    const next=await api('/selection',{session:state.session,revision:state.revision,...action});
    if(closed||epoch!==lifecycle)return;
    state=next;
    if(action.gender) {
      rendered=[];result.src='/mannequin?gender='+state.gender;
      document.querySelector('#worn').textContent='';document.querySelector('#preview-title').textContent='Mannequin de référence';
    }
  }).catch(async failure=>{
    if(!closed&&epoch===lifecycle) {
      error.textContent=failure.message;
      const next=await api('/state?session='+state.session);
      if(!closed&&epoch===lifecycle)state=next;
    }
  }).finally(()=>{if(epoch===lifecycle){mutationCount--;paint();}});
}
form.addEventListener('change',event=>{
  if(event.target.id==='gender')mutation({gender:event.target.value});
  else if(event.target.closest('#slots'))mutation(event.target.value?{id:event.target.value}:{remove:event.target.name});
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!state||busy||closed||mutationCount||!state.ability.available)return;
  const ticket=++generation,requested=state;
  controller=new AbortController();busy=true;error.textContent='';status.textContent='Calcul de la tenue en cours…';paint();
  try {
    const requestId=crypto.randomUUID();
    const answer=await api('/try',{session:requested.session,revision:requested.revision,requestId},controller.signal);
    const next=new Image();next.src=answer.image;await next.decode();
    if(closed||ticket!==generation||answer.revision!==state.revision||answer.requestId&&answer.requestId!==requestId)return;
    result.src=answer.image;rendered=answer.selected;
    document.querySelector('#preview-title').textContent=rendered.length?'Résultat calculé · à inspecter':'Mannequin de référence';
    document.querySelector('#worn').textContent=rendered.length?'Tenue du rendu — '+rendered.map(item=>item.name+' · '+item.color).join(' + '):'';
    status.textContent=answer.cached?'Résultat réutilisé depuis le cache.':`Coût communiqué par Runware ${answer.measuredUsd.toFixed(4)} USD.`;
  } catch(failure){if(ticket===generation&&!closed&&failure.name!=='AbortError')error.textContent=failure.message+' Le rendu affiché est conservé.';}
  finally {
    if(ticket===generation&&!closed) {
      busy=false;const session=state.session;
      try {
        await loadCatalog();if(ticket!==generation||closed)return;
        const next=await api('/state?session='+session);
        if(ticket===generation&&!closed){state=next;paint();}
      } catch(failure){if(!closed&&ticket===generation)error.textContent=failure.message;}
    }
  }
});
upload.addEventListener('submit',async event=>{
  event.preventDefault();const button=upload.querySelector('button');button.disabled=true;
  const epoch=lifecycle;
  const notice=document.querySelector('#import-status');
  try {
    const values=Object.fromEntries(new FormData(upload));
    if(values.photo.size>6000000)throw Error('Photo limitée à 6 Mo.');
    values.photo=await new Promise((accept,reject)=>{const reader=new FileReader();reader.onload=()=>accept(reader.result);reader.onerror=()=>reject(Error('Lecture impossible.'));reader.readAsDataURL(values.photo);});
    values.quality={hanger:values.hanger,background:values.background,framing:values.framing};
    const item=await api('/import',values);
    if(closed||epoch!==lifecycle)return;
    invalidate();await loadCatalog();
    const next=await api('/state?session='+state.session);
    if(closed||epoch!==lifecycle)return;
    state=next;paint();
    notice.textContent='Variante importée. '+item.quality.warnings.join(' ');
    if(['Mixte',state.gender].includes(item.gender))mutation({id:item.id});
  } catch(failure){notice.textContent=failure.message;}
  finally{button.disabled=false;}
});
window.addEventListener('pagehide',()=>{
  closed=true;lifecycle++;invalidate();
  if(state)navigator.sendBeacon('/exit',JSON.stringify({session:state.session}));
  state=undefined;rendered=[];
});
window.addEventListener('pageshow',event=>{if(event.persisted)void openSession().catch(failure=>{error.textContent=failure.message;});});
void openSession().catch(failure=>{error.textContent=failure.message;});
