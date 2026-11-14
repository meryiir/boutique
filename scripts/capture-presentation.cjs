const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const base='https://maison-edit.meryem-boujja.com';
const output=path.resolve('docs/presentation-maison-edit');
const scratch=path.resolve('prototypes/try-on/.data/presentation-capture');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(scratch,{recursive:true});
fs.mkdirSync(path.join(output,'assets'),{recursive:true});
for(const name of ['Manrope-Regular.woff2','CormorantGaramond.woff2','OFL.txt','OFL-CormorantGaramond.txt'])fs.copyFileSync(path.resolve('public/fonts',name),path.join(output,'assets',name));
const browserRoot=path.join(process.env.LOCALAPPDATA,'ms-playwright');
const executablePath=fs.readdirSync(browserRoot).filter(name=>/^chromium-\d+$/.test(name)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])).map(name=>path.join(browserRoot,name,'chrome-win64/chrome.exe')).find(fs.existsSync);
const manifest={source:base,captured:new Date().toISOString(),screenshots:[],videos:[],notes:['Captures réelles de la version publique de démonstration.','Les mannequins utilisent les aperçus préparés disponibles dans cette version.','Aucun rendu Runware payant ni rotation 360° ne sont présentés.']};
const save=()=>fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
async function ready(page){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(650);}
async function go(page,route){await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});await ready(page);}
async function shot(page,name,title,locator,details=''){
  await ready(page);
  await (locator||page).screenshot({path:path.join(output,name+'.png'),...(locator?{}:{fullPage:false})});
  manifest.screenshots.push({file:name+'.png',title,details,url:page.url()});save();console.log('CAPTURE '+name);
}
async function section(page,selector){
  const target=page.locator(selector);
  await target.evaluate(element=>window.scrollTo({top:element.getBoundingClientRect().top+scrollY-120,behavior:'instant'}));
  await page.waitForTimeout(1000);return target;
}
async function warm(page){
  for(let top=0;top<await page.evaluate(()=>document.body.scrollHeight);top+=700){await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),top);await page.waitForTimeout(120);}
  await page.waitForTimeout(400);
}
async function wear(page){
  await page.locator('#product-try-on').click();
  await page.locator('.fitting-prepared').waitFor({state:'visible',timeout:15000});
  await page.locator('.fitting-prepared').evaluate(image=>image.decode());await page.waitForTimeout(800);
}

(async()=>{
  const browser=await chromium.launch({executablePath});
  const desktop=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1.5,reducedMotion:'no-preference',recordVideo:{dir:scratch,size:{width:1920,height:1200}}});
  const clock=Date.now();
  const elapsed=()=>(Date.now()-clock)/1000;
  const page=await desktop.newPage();
  const clips=[];
  await go(page,'/');await page.waitForTimeout(1000);
  const tourStart=elapsed();
  await shot(page,'01-accueil-desktop','Accueil · campagne femme et homme');
  await warm(page);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await ready(page);
  await page.screenshot({path:path.join(output,'02-accueil-complet.png'),fullPage:true});
  manifest.screenshots.push({file:'02-accueil-complet.png',title:'Accueil complet',details:'Vue intégrale de la page.',url:page.url()});save();
  const rack=await section(page,'#wardrobe');
  const garments=rack.locator('.rack-garment');
  for(let i=0;i<await garments.count();i++){await garments.nth(i).hover();await page.waitForTimeout(700);}
  await garments.first().hover();await page.waitForTimeout(700);await page.mouse.move(10,10);await page.waitForTimeout(600);
  await shot(page,'03-showroom-portant','Showroom · les huit hoodies',rack);
  const showroomStart=elapsed();
  await page.waitForTimeout(1000);
  for(const i of [0,3,5,7,1]){
    await garments.nth(i).hover();await page.waitForTimeout(1000);
    if(i===0)await shot(page,'04-showroom-nocturne','Showroom · passage du profil à la face',rack,'État au survol du Hoodie Nocturne.');
    if(i===3)await shot(page,'05-showroom-sillage','Showroom · broderies et séparation des pièces',rack,'État au survol du Hoodie Sillage.');
  }
  await page.mouse.move(10,10);await page.waitForTimeout(1000);
  clips.push({name:'01-animation-showroom',title:'Animation du showroom',start:showroomStart,duration:elapsed()-showroomStart});
  await shot(page,'06-nouvelle-collection','Direction artistique · nouvelle collection',await section(page,'.new-collection'));
  await shot(page,'07-categories','Navigation · catégories',await section(page,'.categories-section'));
  await shot(page,'08-campagne-editoriale','Campagne éditoriale',await section(page,'.story'));
  await shot(page,'09-lookbook','Lookbook · inspirations',await section(page,'#lookbook'));
  await go(page,'/collection?genre=Femme');
  await shot(page,'10-catalogue-femme','Catalogue femme · filtres, variantes et studio');
  await go(page,'/produit/chemise-aube');
  await shot(page,'11-fiche-produit','Fiche article · photo, couleurs et tailles');
  const femaleStart=elapsed();await wear(page);
  await shot(page,'12-studio-femme','Studio femme · aperçu porté préparé');
  await shot(page,'13-mannequin-femme-detail','Mannequin femme · détail de l’aperçu préparé',page.locator('.fitting-room'));
  clips.push({name:'02-animation-essayage-femme',title:'Transition d’essayage femme · visuel préparé',start:femaleStart,duration:elapsed()-femaleStart});
  const surface=page.locator('.product-zoom-surface').first();
  await surface.hover({position:{x:260,y:300}});await page.waitForTimeout(500);
  await shot(page,'14-zoom-matiere','Zoom automatique au survol',page.locator('.gallery-main'));
  await page.mouse.move(10,10);
  await page.getByRole('button',{name:'Guide des tailles',exact:true}).click();
  await shot(page,'15-guide-tailles','Guide des tailles',page.getByRole('dialog'));
  await page.keyboard.press('Escape');
  await page.getByRole('group',{name:'Taille',exact:true}).getByRole('button',{name:'M',exact:true}).click();
  await page.locator('.add-to-cart').click();
  await page.getByRole('dialog').waitFor();
  await shot(page,'16-panier','Panier · simulation d’achat');
  await page.keyboard.press('Escape');
  await go(page,'/collection?genre=Femme');
  for(const name of ['Chemise Aube','Pantalon Dune','Veste Atelier']){
    const card=page.locator('.product-card').filter({has:page.getByRole('link',{name,exact:true})});
    await card.locator('.card-try-on').click();await page.waitForTimeout(700);
  }
  await shot(page,'17-tenue-femme-complete','Studio femme · chemise, pantalon et veste',page.locator('.fitting-room'),'Association disponible en aperçu préparé.');
  await go(page,'/produit/hoodie-noir');
  const maleStart=elapsed();await wear(page);
  await shot(page,'18-studio-homme','Studio homme · aperçu porté préparé');
  await shot(page,'19-mannequin-homme-detail','Mannequin homme · détail de l’aperçu préparé',page.locator('.fitting-room'));
  clips.push({name:'03-animation-essayage-homme',title:'Transition d’essayage homme · visuel préparé',start:maleStart,duration:elapsed()-maleStart});
  await go(page,'/maison');await shot(page,'20-la-maison','La Maison · identité de marque');
  const tourEnd=elapsed();
  const raw=await page.video().path();await desktop.close();
  clips.push({name:'04-visite-boutique',title:'Visite de la boutique et de ses interactions',start:tourStart,duration:tourEnd-tourStart});
  for(const clip of clips){
    const file=clip.name+'.mp4';
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(clip.start),'-i',raw,'-t',String(clip.duration),'-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(output,file)],{stdio:'inherit'});
    manifest.videos.push({file,title:clip.title,seconds:clip.duration});save();console.log('VIDEO '+file);
  }
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const phone=await mobile.newPage();
  await go(phone,'/');await shot(phone,'21-accueil-mobile','Accueil mobile');
  await shot(phone,'22-showroom-mobile','Showroom mobile',await section(phone,'#wardrobe'));
  await go(phone,'/produit/chemise-aube');await wear(phone);
  await shot(phone,'23-studio-femme-mobile','Studio femme sur mobile · aperçu préparé',phone.locator('.fitting-room'));
  await go(phone,'/produit/hoodie-noir');await wear(phone);
  await shot(phone,'24-studio-homme-mobile','Studio homme sur mobile · aperçu préparé',phone.locator('.fitting-room'));
  await mobile.close();await browser.close();save();
  console.log('TERMINÉ '+output);
})().catch(error=>{console.error(error);save();process.exitCode=1;});
