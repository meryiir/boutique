const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('@playwright/test');
const root=path.resolve('docs/presentation-maison-edit');
const data=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fonts=`@font-face{font-family:Maison;src:url('assets/CormorantGaramond.woff2')}@font-face{font-family:Manrope;src:url('assets/Manrope-Regular.woff2')}`;
const common=`${fonts}*{box-sizing:border-box}body{margin:0;background:#f4f0e9;color:#21251f;font:14px Manrope,sans-serif}h1,h2,h3{font-family:Maison,serif;font-weight:400}a{color:inherit}small{letter-spacing:.12em}img{display:block;max-width:100%}`;
const image=(name,alt)=>`<img src="${name}" alt="${escape(alt)}">`;
const cover=`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Maison Édit · Présentation</title><style>${common}
body{width:2000px;height:1500px;padding:65px 75px}header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #c7c5b9;padding-bottom:20px}header strong{font:55px Maison}header span{font-size:15px}h1{font-size:88px;margin:28px 0 28px;line-height:1}h1 em{font-weight:400}.board{height:1100px;display:grid;grid-template-columns:1.25fr 1.25fr .9fr;grid-template-rows:740px 315px;gap:25px}figure{margin:0;display:flex;flex-direction:column;min-height:0}figure img{height:calc(100% - 34px);width:100%;object-fit:contain;background:#e5e0d5;border:1px solid #c8c2b6}figcaption{font-size:16px;margin-top:10px}.hero{grid-column:1/3}.hero img{object-fit:contain}.mobile{grid-column:3;grid-row:1/3}.mobile img{object-fit:contain;background:#e9e2d7}.studio-pair{display:flex;justify-content:center;gap:15px;background:#e5e0d5;border:1px solid #c8c2b6;height:calc(100% - 34px)}.studio-pair img{width:auto;height:100%;border:0}footer{font-size:14px;border-top:1px solid #c7c5b9;padding-top:18px;display:flex;justify-content:space-between;color:#625f55}</style>
<header><strong>MAISON ÉDIT</strong><span>PRÉSENTATION DU PROJET · NOVEMBRE 2026</span></header>
<h1>Une boutique à <em>explorer.</em></h1><div class="board">
<figure class="hero">${image('01-accueil-desktop.png','Accueil de Maison Édit')}<figcaption>Accueil · campagne femme et homme</figcaption></figure>
<figure class="mobile">${image('21-accueil-mobile.png','Accueil sur mobile')}<figcaption>Expérience mobile</figcaption></figure>
<figure>${image('04-showroom-nocturne.png','Showroom interactif au survol')}<figcaption>Showroom interactif · huit hoodies animés</figcaption></figure>
<figure><div class="studio-pair">${image('25-silhouette-femme.png','Mannequin femme')}${image('26-silhouette-homme.png','Mannequin homme')}</div><figcaption>Mannequins femme et homme · aperçus préparés</figcaption></figure>
</div><footer><span>Captures du site public et vidéos d’interactions</span><span>Visuels de démonstration · essayage actuel par aperçus préparés</span></footer></html>`;
fs.writeFileSync(path.join(root,'couverture.html'),cover);
const sections=[
  {title:'Accueil & direction artistique',files:['01-accueil-desktop.png','06-nouvelle-collection.png','08-campagne-editoriale.png','09-lookbook.png','20-la-maison.png']},
  {title:'Le showroom',files:['03-showroom-portant.png','04-showroom-nocturne.png','05-showroom-sillage.png']},
  {title:'Catalogue & parcours produit',files:['07-categories.png','10-catalogue-femme.png','11-fiche-produit.png','14-zoom-matiere.png','15-guide-tailles.png','16-panier.png']},
  {title:'Les mannequins',files:['25-silhouette-femme.png','26-silhouette-homme.png','12-studio-femme.png','13-mannequin-femme-detail.png','17-tenue-femme-complete.png','18-studio-homme.png','19-mannequin-homme-detail.png']},
  {title:'Sur mobile',files:['21-accueil-mobile.png','22-showroom-mobile.png','23-studio-femme-mobile.png','24-studio-homme-mobile.png']}
];
const cards=sections.map(section=>`<section><h2>${section.title}</h2><div class="grid">${section.files.map(file=>{
 const item=data.screenshots.find(item=>item.file===file);if(!item)return '';
 return `<figure><a href="${file}" target="_blank">${image(file,item.title)}</a><figcaption><strong>${escape(item.title)}</strong>${item.details?`<p>${escape(item.details)}</p>`:''}<a href="${file}" download>Télécharger la capture HD ↗</a></figcaption></figure>`;
}).join('')}</div></section>`).join('');
const videos=data.videos.map(video=>`<figure><video controls preload="metadata" playsinline src="${video.file}" ${video.file.includes('showroom')?'poster="04-showroom-nocturne.png"':''}></video><figcaption><strong>${escape(video.title)}</strong><a href="${video.file}" download>Télécharger la vidéo MP4 ↗</a></figcaption></figure>`).join('');
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maison Édit · Captures & animations</title><style>${common}
header{padding:35px 6%;display:flex;justify-content:space-between;border-bottom:1px solid #c9c4b8;gap:20px}header a{text-decoration:none;font:36px Maison}header span{align-self:center;font-size:12px}.intro{padding:55px 6% 35px}h1{font-size:clamp(52px,7vw,95px);line-height:.95;margin:0 0 25px}.intro p{max-width:800px;line-height:1.8;color:#655f54}.intro nav{display:flex;gap:25px;flex-wrap:wrap;margin-top:25px}main{max-width:1700px;margin:auto;padding:0 6% 60px}section{padding-top:40px;border-top:1px solid #cdc7bb;margin-top:45px}h2{font-size:50px;margin:0 0 25px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:35px}figure{margin:0;min-width:0}figure img{width:100%;height:410px;object-fit:contain;background:#e6e0d5;border:1px solid #d0c8ba}figcaption{padding:14px 0;font-size:12px;line-height:1.7}figcaption strong{display:block;font-weight:400;font-size:15px}figcaption a{display:inline-block;margin-top:8px;text-underline-offset:4px}figcaption p{margin:5px 0;color:#655f54}video{width:100%;background:#e5e0d5;aspect-ratio:8/5;object-fit:contain}.overview{max-height:500px;object-fit:contain;width:100%}footer{padding:35px 6%;background:#24281f;color:#f4f0e9;font-size:12px;line-height:1.8}@media(max-width:700px){.grid{grid-template-columns:1fr}header{display:block}header span{display:block;margin-top:8px}figure img{height:320px}h2{font-size:38px}}</style>
<header><a href="#">MAISON ÉDIT</a><span>CAPTURES & ANIMATIONS DU PROJET</span></header>
<div class="intro"><h1>Le vestiaire, <em>en images.</em></h1><p>Une sélection de captures haute définition et de séquences enregistrées dans la boutique. Les vues des mannequins présentent les aperçus préparés disponibles sur le site public. Le pilote automatique Runware attend ses essais payants autorisés.</p><nav><a href="#animations">Voir les animations</a><a href="00-vue-ensemble.png" download>Télécharger la planche de présentation</a><a href="02-accueil-complet.png" target="_blank">Voir l’accueil complet</a></nav></div>
<main><a href="00-vue-ensemble.png" target="_blank"><img class="overview" src="00-vue-ensemble.png" alt="Vue d’ensemble du projet Maison Édit"></a><section id="animations"><h2>La boutique en <em>mouvement.</em></h2><div class="grid">${videos}</div></section>${cards}</main>
<footer>Capturé sur <a href="${data.source}">${data.source.replace('https://','')}</a> · ${new Date(data.captured).toLocaleDateString('fr-FR',{timeZone:'Africa/Casablanca'})}<br>Les captures conservent le contenu et les mentions de démonstration du site. Les animations d’essayage affichent des visuels préparés.</footer></html>`;
fs.writeFileSync(path.join(root,'index.html'),html);
(async()=>{
 const cache=path.join(process.env.LOCALAPPDATA,'ms-playwright');
 const executablePath=fs.readdirSync(cache).filter(name=>/^chromium-\d+$/.test(name)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])).map(name=>path.join(cache,name,'chrome-win64/chrome.exe')).find(fs.existsSync);
 const browser=await chromium.launch({executablePath});
 const page=await browser.newPage({viewport:{width:2000,height:1500},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(root,'couverture.html')).href);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(root,'00-vue-ensemble.png')});
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.evaluate(()=>document.fonts.ready);
 console.log(JSON.stringify({screenshots:data.screenshots.length,videos:data.videos.length,gallery:path.join(root,'index.html'),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
