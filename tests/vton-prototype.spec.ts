import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const base=process.env.VTON_TEST_URL || 'http://127.0.0.1:3196';
test('Prototype sans moteur — cache explicite, combinaison indisponible, import et retrait',async({page,request})=>{
  test.skip(!process.env.VTON_TEST_URL,'Lancer le serveur de relecture et fournir VTON_TEST_URL.');
  await page.goto(base);
  const top=page.locator('select[name=tops]');
  const bottom=page.locator('select[name=bottoms]');
  const calculate=page.locator('#outfit button');
  await top.selectOption('alpine');
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(page.locator('#status')).toContainText('cache');
  const image=await page.locator('#result').getAttribute('src');
  await bottom.selectOption('rivage');
  await expect(calculate).toBeDisabled();
  await expect(page.locator('#availability')).toContainText('Moteur désactivé');
  await expect(page.locator('#result')).toHaveAttribute('src',image!);
  const refused=await request.post(base+'/try',{data:{ids:['alpine','rivage']}});
  expect(refused.status()).toBe(503);
  await top.selectOption('');
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(page.locator('#worn')).toContainText('Pantalon Rivage · Olive');
  await bottom.selectOption('');
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(page.locator('#result')).toHaveAttribute('src','/image/reference');
  await page.locator('#import input[name=name]').fill('Article importé par le navigateur');
  await page.locator('#import input[name=variant]').fill('Référence originale');
  await page.locator('input[type=file]').setInputFiles('public/images/catalog/product-06-front.webp');
  await page.getByRole('button',{name:'Importer',exact:true}).click();
  await expect(page.locator('#import-status')).toHaveText('Variante importée.');
  await expect(calculate).toBeDisabled();
  await expect(page.locator('#availability')).toContainText('Moteur désactivé');
  await expect(page.locator('#result')).toHaveAttribute('src','/image/reference');
});

for(const width of [1440,390])test(`Sélection indépendante du rendu et remplacements sans retrait préalable à ${width}px`,async({page,request},testInfo)=>{
  test.skip(!process.env.VTON_TEST_URL,'Lancer le prototype sans moteur et fournir VTON_TEST_URL.');
  const imported:Record<string,string>={};
  for(const [name,category,index] of [
    ['Hoodie Sable','tops',3],['Dune','bottoms',12],['Rivage','bottoms',14],
    ['Wild Cards','tops',1],['Atelier','outerwear',9],['Nomade','outerwear',11]
  ] as const) {
    const photo=await readFile(`public/images/catalog/product-${String(index).padStart(2,'0')}-front.webp`);
    const response=await request.post(base+'/import',{data:{name,category,gender:'Mixte',variant:'Photo originale',photo:'data:image/webp;base64,'+photo.toString('base64')}});
    expect(response.status()).toBe(201);
    imported[name]=(await response.json()).id;
  }
  await page.setViewportSize({width,height:900});
  await page.goto(base);
  const chosen=page.getByRole('list',{name:'Articles sélectionnés'});
  const top=page.locator('select[name=tops]');
  const bottom=page.locator('select[name=bottoms]');
  const jacket=page.locator('select[name=outerwear]');
  const calculate=page.locator('#outfit button');
  await top.selectOption(imported['Hoodie Sable']);
  await expect(chosen.locator('li')).toHaveCount(1);
  await bottom.selectOption(imported.Dune);
  await expect(chosen).toContainText('Hoodie Sable');
  await expect(chosen).toContainText('Dune');
  await expect(calculate).toBeDisabled();
  await expect(top).toBeEnabled();
  await expect(bottom).toBeEnabled();
  await bottom.selectOption(imported.Rivage);
  await expect(chosen.locator('li')).toHaveCount(2);
  await expect(chosen).not.toContainText('Dune');
  await expect(chosen).toContainText('Hoodie Sable');
  await expect(chosen).toContainText('Rivage');
  await top.selectOption(imported['Wild Cards']);
  await expect(chosen).toContainText('Wild Cards');
  await expect(chosen).toContainText('Rivage');
  await expect(chosen).not.toContainText('Hoodie Sable');
  await jacket.selectOption(imported.Atelier);
  await expect(chosen.locator('li')).toHaveCount(3);
  await expect(page.locator('#availability')).toContainText('vestes superposées');
  await jacket.selectOption(imported.Nomade);
  await expect(chosen.locator('li')).toHaveCount(3);
  await expect(chosen).not.toContainText('Atelier');
  await expect(chosen).toContainText('Wild Cards');
  await expect(chosen).toContainText('Rivage');
  await jacket.selectOption('');
  await expect(chosen.locator('li')).toHaveCount(2);
  await top.selectOption('');
  await expect(chosen.locator('li')).toHaveCount(1);
  await expect(chosen).toContainText('Rivage');
  await expect(page.locator('#render-state')).toContainText('attend son propre calcul');
  await expect(page.locator('#result')).toHaveAttribute('src','/image/reference');
  await page.screenshot({path:testInfo.outputPath('selection-sans-rendu.png'),fullPage:true});
});
