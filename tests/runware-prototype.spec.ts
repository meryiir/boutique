import {test,expect} from '@playwright/test';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';

let runtime:ReturnType<typeof import('../prototypes/try-on/runware-server.mjs').createRunwareServer>;
let base:string;
test.beforeAll(async()=>{
  // Load native ESM outside Playwright's CommonJS transform.
  const load=new Function('url','return import(url)') as (url:string)=>Promise<typeof import('../prototypes/try-on/runware-server.mjs')>;
  const {createRunwareServer}=await load(pathToFileURL(resolve('prototypes/try-on/runware-server.mjs')).href);
  const root=resolve('prototypes/try-on/.data');mkdirSync(root,{recursive:true});
  const image=await sharp(readFileSync('public/images/fitting/mannequin-femme.webp')).png().toBuffer();
  runtime=createRunwareServer({directory:mkdtempSync(resolve(root,'browser-protocol-')),authorized:true,key:'mock-only',transport:async task=>{
    await new Promise(accept=>setTimeout(accept,400));
    return {bytes:image,costMicros:23000,taskUUID:task.taskUUID,imageUUID:'mock-only'};
  }});
  await new Promise<void>(accept=>runtime.server.listen(0,'127.0.0.1',accept));
  const address=runtime.server.address();
  if(!address||typeof address==='string')throw Error('Serveur local indisponible');
  base='http://127.0.0.1:'+address.port;
});
test.afterAll(async()=>{await new Promise<void>(accept=>runtime.server.close(()=>accept()));runtime.database.close();});

for(const width of [1440,390])test(`Protocole Runware simulé à ${width}px — sélection, calcul explicite, changement, genre et sortie`,async({page,request},testInfo)=>{
  const ids:Record<string,string>={};
  for(const [product,category,gender,index] of [['hoodie','top-layers','Mixte',3],['dune','bottoms','Femme',12],['rivage','bottoms','Mixte',14]] as const) {
    const bytes=readFileSync(`public/images/catalog/product-${String(index).padStart(2,'0')}-front.webp`);
    const response=await request.post(base+'/import',{data:{product:product+'-'+width,variant:'ref',name:product,color:'Original',category,gender,photo:'data:image/webp;base64,'+bytes.toString('base64')}});
    expect(response.status()).toBe(201);ids[product]=(await response.json()).id;
  }
  await page.setViewportSize({width,height:900});
  const created=page.waitForResponse(response=>new URL(response.url()).pathname==='/session'&&response.status()===201);
  await page.goto(base);
  const session=(await(await created).json()).session;
  const top=page.locator('#slots select[name="top-layers"]');
  const bottom=page.locator('#slots select[name=bottoms]');
  const selected=page.getByRole('list',{name:'Articles sélectionnés'});
  await top.selectOption(ids.hoodie);
  await expect(selected.locator('li')).toHaveCount(1);
  await bottom.selectOption(ids.dune);
  await expect(selected.locator('li')).toHaveCount(2);
  expect(runtime.database.audit().filter(job=>job.metadata.variants.some((item:{id:string})=>item.id===ids.hoodie))).toHaveLength(0);
  await page.getByRole('button',{name:'Visualiser ma tenue'}).click();
  await expect(page.locator('#status')).toContainText('Calcul de la tenue');
  await expect(page.locator('#worn')).toContainText('hoodie');
  await expect(page.locator('#worn')).toContainText('dune');
  const previous=await page.locator('#result').getAttribute('src');
  await bottom.selectOption(ids.rivage);
  await expect(selected).toContainText('rivage');
  await expect(selected).toContainText('hoodie');
  await expect(selected).not.toContainText('dune');
  await expect(page.locator('#render-state')).toContainText('Sélection modifiée');
  await expect(page.locator('#result')).toHaveAttribute('src',previous!);
  await page.getByRole('button',{name:'Visualiser ma tenue'}).click();
  await expect(page.locator('#worn')).toContainText('rivage');
  await expect(page.locator('#result')).not.toHaveAttribute('src',previous!);
  await top.selectOption('');
  await expect(selected.locator('li')).toHaveCount(1);
  await expect(selected).toContainText('rivage');
  await page.screenshot({path:testInfo.outputPath('interface-protocole-simule.png'),fullPage:true});
  await page.locator('#gender').selectOption('Homme');
  await expect(selected.locator('li')).toHaveCount(0);
  await expect(page.locator('#result')).toHaveAttribute('src','/mannequin?gender=Homme');
  await expect(bottom.locator(`option[value="${ids.dune}"]`)).toHaveCount(0);
  await page.goto(base+'/catalog');
  const closed=await request.post(base+'/selection',{data:{session,revision:0,id:ids.hoodie}});
  expect(closed.status()).toBe(410);
  await page.goto(base);
  await expect(selected.locator('li')).toHaveCount(0);
  await expect(page.locator('#result')).toHaveAttribute('src','/mannequin?gender=Femme');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
