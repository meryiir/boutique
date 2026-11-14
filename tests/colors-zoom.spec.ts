import { test,expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { products } from '../data/products';
test.use({trace:'off'});

test('32 produits : au moins trois couleurs uniques, images et stocks par variante',async({request})=>{
 test.setTimeout(90000);
 for(const product of products){
  expect(product.colors.length,product.name).toBeGreaterThanOrEqual(3);
  expect(new Set(product.colors.map(c=>c.name)).size).toBe(product.colors.length);
  const images=new Set<string>();
  for(const color of product.colors){
   const response=await request.get(color.image);expect(response.status(),color.image).toBe(200);
   const bytes=await response.body();expect(bytes.length).toBeGreaterThan(1000);
   images.add(createHash('sha256').update(bytes).digest('hex'));
   for(const size of product.sizes)expect(product.variants.some(v=>v.color===color.name&&v.size===size)).toBe(true);
   if(color.back)expect((await request.get(color.back)).status()).toBe(200);
  }
  expect(images.size,product.name).toBe(product.colors.length);
 }
});

test('Changer de couleur modifie les photos et la couleur ajoutée au panier',async({page})=>{
 for(const slug of ['veste-atelier','hoodie-noir','robe-lumiere','cabas-quotidien']){
  await page.goto(`/produit/${slug}`);
  const swatches=page.locator('.product-detail .swatch');
  expect(await swatches.count()).toBeGreaterThanOrEqual(3);
  const before=await page.locator('.gallery-image').getAttribute('src');
  await swatches.nth(2).click();
  await expect(swatches.nth(2)).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.gallery-image').getAttribute('src')).not.toBe(before);
  await expect.poll(()=>page.locator('.gallery-image').evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
 }
 await page.goto('/produit/hoodie-noir');
 await page.getByRole('button',{name:'Couleur Olive',exact:true}).click();
 await page.getByRole('button',{name:'M',exact:true}).click();
 await page.getByRole('button',{name:'Ajouter au panier',exact:true}).click();
 await expect(page.getByRole('dialog',{name:/Votre panier/})).toContainText('Olive / M');
});

test('Zoom au survol : suit la souris, agrandissement réglable et déplacement clavier',async({page})=>{
 await page.goto('/produit/veste-atelier');
 const surface=page.locator('.product-zoom-surface'),photo=page.locator('.gallery-image');
 await surface.hover({position:{x:100,y:120}});
 await expect(surface).toHaveAttribute('data-zoomed','true');
 await expect.poll(()=>photo.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(2);
 const origin=await photo.evaluate(el=>getComputedStyle(el).transformOrigin);
 await surface.hover({position:{x:210,y:240}});
 expect(await photo.evaluate(el=>getComputedStyle(el).transformOrigin)).not.toBe(origin);
 await page.mouse.move(5,5);await expect(surface).toHaveAttribute('data-zoomed','false');
 await page.getByRole('button',{name:'Agrandir le visuel',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Augmenter le zoom',exact:true}).click();
 await expect(dialog.locator('.detail-zoom-stage')).toHaveAttribute('data-scale','2');
 const stage=dialog.locator('.detail-zoom-stage');await stage.focus();await page.keyboard.press('ArrowRight');
 await expect(stage.locator('img')).toHaveAttribute('style',/translate\(-40px/);
 await dialog.getByRole('button',{name:'Réinitialiser le zoom',exact:true}).click();
 await expect(stage).toHaveAttribute('data-scale','1');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
});

test('Mobile : toucher pour agrandir, commandes de zoom et glissement',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();await page.goto('/produit/chemise-medina');
 await page.locator('.product-zoom-surface').tap();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Augmenter le zoom',exact:true}).tap();
 const stage=dialog.locator('.detail-zoom-stage');await expect(stage).toHaveAttribute('data-scale','2');
 await stage.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',button:0,clientX:160,clientY:240});
 await stage.dispatchEvent('pointermove',{pointerId:8,pointerType:'touch',clientX:190,clientY:290});
 await stage.dispatchEvent('pointerup',{pointerId:8,pointerType:'touch',clientX:190,clientY:290});
 await expect.poll(()=>stage.locator('img').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41)).toBe(30);
 await expect.poll(()=>stage.locator('img').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m42)).toBe(50);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await context.close();
});

test('Aperçu rapide : couleur et zoom sur le même visuel',async({page})=>{
 await page.goto('/collection');
 await page.locator('.product-card').first().locator('.quick-add').click();
 const quick=page.getByRole('dialog',{name:'Une pièce, votre façon de la porter'});
 await expect(quick).toBeVisible();
 await quick.locator('.swatch').nth(1).click();
 await expect(quick.locator('.gallery-image')).toHaveAttribute('src',/item-00-a-front/);
 await quick.locator('.product-zoom-surface').click();
 const zoom=page.getByRole('dialog',{name:/les détails/});await expect(zoom).toBeVisible();
 await expect(zoom.locator('.detail-zoom-stage img')).toHaveAttribute('src',/item-00-a-front/);
 await page.keyboard.press('Escape');await expect(quick).toBeVisible();
});


test('Le zoom automatique explore le détail sous la souris sans clic ni glissement',async({page})=>{
 await page.goto('/produit/veste-atelier');
 const surface=page.locator('.product-zoom-surface');
 await surface.hover({position:{x:140,y:200}});
 await expect(surface).toHaveAttribute('data-zoomed','true');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(surface.locator('img')).toHaveAttribute('src',/^\/images\//);
 await page.getByRole('button',{name:'Agrandir le visuel',exact:true}).click();
 const stage=page.locator('.detail-zoom-stage');
 await stage.hover({position:{x:100,y:150}});
 await expect(stage).toHaveAttribute('data-scale','2.5');
 const before=await stage.locator('img').getAttribute('style');
 await stage.hover({position:{x:260,y:300}});
 expect(await stage.locator('img').getAttribute('style')).not.toBe(before);
 await expect(stage.locator('img')).toHaveAttribute('src',/^\/images\//);
 await page.mouse.move(5,5);
 await expect(stage).toHaveAttribute('data-mouse-zoom','false');
});
