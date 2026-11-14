import {test,expect} from '@playwright/test';
import {products} from '../data/products';
import {findPreparedLook,type FittingGender} from '../data/prepared-looks';
import {addToWardrobe} from '../components/fitting/wardrobe';
test.use({trace:'off'});
const room=(page:import('@playwright/test').Page)=>page.getByRole('complementary',{name:'Cabine d’essayage'});
const select=(page:import('@playwright/test').Page,name:string)=>page.getByRole('button',{name:new RegExp(`^(?:Essayer|Ajouter à la tenue) ${name},`)}).click();

test('Remplacements de catégories : un haut conserve le pantalon et réciproquement',()=>{
 for(const gender of ['Femme','Homme'] as const){const bottom=products.find(p=>p.category==='Pantalons'&&p.gender===gender)!,top=products.find(p=>p.category==='Chemises'&&p.gender===gender)!;let look=addToWardrobe({},bottom,bottom.colors[0].name);look=addToWardrobe(look,top,top.colors[0].name);expect(look.bottom?.productId).toBe(bottom.id);look=addToWardrobe(look,products[6],products[6].colors[0].name);expect(look.bottom?.productId).toBe(bottom.id);look=addToWardrobe(look,products[14],products[14].colors[0].name);expect(look.top?.productId).toBe(products[6].id);expect(look.bottom?.productId).toBe(products[14].id);}
});

test('Fiche : mannequin d’origine, bouton Essayer visible et cadre sans défilement interne',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/produit/chemise-riviera');const cabin=room(page);
 await expect(cabin.locator('.fitting-avatar')).toHaveAttribute('src',/mannequin-homme\.webp$/);
 await expect(cabin.getByRole('button',{name:'Femme',exact:true})).toHaveCount(0);
 const button=page.locator('#product-try-on');await expect(button).toBeVisible();const box=await button.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(768);
 expect(await cabin.evaluate(el=>({overflow:getComputedStyle(el).overflowY,maxHeight:getComputedStyle(el).maxHeight}))).toEqual({overflow:'visible',maxHeight:'none'});
 await expect(cabin.locator('.fitting-view-controls,.fitting-render-modes')).toHaveCount(0);await expect(cabin.locator('.fitting-rotate-icon')).toHaveCount(0);
 await button.click();await expect(cabin).toHaveAttribute('aria-busy','false');await expect(cabin.locator('.fitting-prepared')).toHaveAttribute('src',/chemise-riviera/);await expect(cabin.locator('.mannequin-three')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/studio-original-compact-desktop.png'});
});

test('Portant : accès direct à Essayer et mannequin femme seul sur une fiche Femme',async({page})=>{
 await page.goto('/');
 await page.locator('#wardrobe').getByRole('link',{name:'Essayer',exact:true}).click();
 await expect(page).toHaveURL(/hoodie-noir\/?#product-try-on$/);
 await expect(page.locator('#product-try-on')).toBeInViewport();
 await page.goto('/produit/robe-lumiere');
 const cabin=room(page);
 await expect(cabin.locator('.fitting-avatar')).toHaveAttribute('src',/mannequin-femme\.webp$/);
 await expect(cabin.getByRole('button',{name:'Homme',exact:true})).toHaveCount(0);
});

test('Essayer visible dans le studio, l’aperçu rapide et après un clic sur un hoodie animé',async({page})=>{
 await page.goto('/produit/t-shirt-alpine');const cabin=room(page);
 await page.locator('.gallery-main>.card-try-on').click();
 await expect(cabin).toHaveAttribute('aria-busy','false');
 await expect(cabin.locator('.fitting-items')).toContainText('T-shirt Alpine');
 await page.goto('/');
 await page.getByRole('button',{name:'01 — Explorer Hoodie Nocturne',exact:true}).click();
 await expect(page).toHaveURL(/hoodie-noir\/?#product-try-on$/);
 await expect(page.locator('#product-try-on')).toBeInViewport();
 await expect(room(page).locator('.fitting-current-try-on')).toHaveCount(0);
 await page.goto('/collection');
 await page.locator('.quick-add').first().click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'Essayer sur le mannequin'})).toBeVisible();
});

test('Mobile : toucher un hoodie animé ouvre la fiche et son bouton Essayer',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 try{
  await page.goto('/');await page.getByRole('button',{name:'02 — Explorer Hoodie Dune',exact:true}).tap();
  await expect(page).toHaveURL(/hoodie-dune\/?#product-try-on$/);
  await expect(page.locator('#product-try-on')).toBeInViewport();
  await page.locator('#product-try-on').tap();
  await expect(room(page)).toHaveAttribute('data-mobile-open','true');
  await expect(room(page).locator('.fitting-current-try-on')).toHaveCount(0);
 }finally{await context.close();}
});

test('Hoodie Dune : la couleur sans photo conserve le mannequin d’origine',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/produit/hoodie-dune');const cabin=room(page);
 const button=page.locator('.gallery-main>.card-try-on');
 await button.click();await expect(cabin.locator('.fitting-prepared')).toHaveAttribute('src',/hoodie-dune-v1/);
 await expect(cabin.locator('.fitting-stage')).toHaveAttribute('data-gender','Femme');
 const color=products.find(product=>product.slug==='hoodie-dune')!.colors[1].name;
 await page.locator('.product-options').getByRole('button',{name:'Couleur '+color,exact:true}).click();
 await expect(cabin.locator('.fitting-photo-unavailable')).toBeVisible();
 await expect(cabin.locator('.mannequin-three')).toHaveCount(0);
 await expect(cabin.locator('.fitting-photo-unavailable')).toBeVisible();
 await expect(cabin.locator('.mannequin-three')).toHaveCount(0);
 await expect(cabin.locator('.fitting-prepared')).toHaveAttribute('src',/hoodie-dune-v1/);
 await expect(cabin.locator('.fitting-items li')).toHaveCount(1);
});
test('Genres et essayage : collection filtrée, article exclusif et aperçu réellement disponible',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const gender of ['Homme','Femme']){
   await page.goto(`/collection?genre=${gender}`);const cabin=room(page);
   if(width===390)await cabin.getByRole('button',{name:'Ouvrir la cabine'}).click();
   await expect(cabin.locator('.fitting-stage')).toHaveAttribute('data-gender',gender);
   await expect(cabin.locator('.fitting-genders button')).toHaveCount(0);
  }
  await page.goto('/collection');await page.getByRole('button',{name:'Découvrir la suite',exact:true}).click();
  const male=page.locator('.product-card').filter({has:page.getByRole('link',{name:'Chemise Riviera',exact:true})});
  await male.locator('.card-try-on').click();
  await expect(room(page)).toHaveAttribute('aria-busy','false');
  await expect(room(page).locator('.fitting-stage')).toHaveAttribute('data-gender','Homme');
  await expect(room(page).locator('.fitting-genders button')).toHaveCount(0);
  await expect(room(page).locator('.fitting-prepared')).toHaveAttribute('src',/chemise-riviera/);
 }
 await page.setViewportSize({width:1440,height:900});await page.goto('/produit/chemise-riviera');
 await expect(room(page).locator('.fitting-genders button')).toHaveCount(0);
 await page.locator('#product-try-on').click();
 await expect(room(page).locator('.fitting-prepared')).toHaveAttribute('src',/chemise-riviera/);

});

test('Les tenues photo Aube–Rivage et Atelier–Dune apparaissent dans les deux ordres',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/collection?genre=Femme');
 const cabin=room(page);
 for(const [first,second,imageName] of [
  ['Chemise Aube','Pantalon Rivage',/Chemise Aube ivoire et le Pantalon Rivage olive/],
  ['Pantalon Rivage','Chemise Aube',/Chemise Aube ivoire et le Pantalon Rivage olive/],
  ['Veste Atelier','Pantalon Dune',/Veste Atelier sable et le Pantalon Dune sable/],
  ['Pantalon Dune','Veste Atelier',/Veste Atelier sable et le Pantalon Dune sable/],
 ] as const){
  await select(page,first);
  await expect(cabin.locator('.fitting-prepared')).toBeVisible();
  await select(page,second);
  const image=cabin.getByRole('img',{name:imageName});
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(img=>{const photo=img as HTMLImageElement;return photo.complete&&photo.currentSrc===photo.src&&photo.naturalWidth>0;})).toBe(true);
  await image.evaluate(img=>(img as HTMLImageElement).decode());
  await expect(cabin.locator('.fitting-partial-preview,.mannequin-three')).toHaveCount(0);
  await expect(cabin.locator('.fitting-items li')).toHaveCount(2);
  if(first==='Veste Atelier') {
   await cabin.scrollIntoViewIfNeeded();
   await page.screenshot({path:'docs/screenshots/atelier-dune-online-1440.png'});
   await select(page,'Pantalon Rivage');
   const replacement=cabin.getByRole('img',{name:'Mannequin femme portant la Veste Atelier sable et le Pantalon Rivage olive',exact:true});
   await expect.poll(()=>replacement.evaluate(img=>{const photo=img as HTMLImageElement;return photo.complete&&photo.currentSrc===photo.src&&photo.naturalWidth>0;})).toBe(true);
   await expect(cabin.locator('[data-slot=bottom]')).toContainText('Pantalon Rivage');
   await expect(cabin.locator('[data-slot=outer]')).toContainText('Veste Atelier');
   await expect(cabin.locator('.fitting-partial-preview,.mannequin-three')).toHaveCount(0);
  }
  await cabin.getByRole('button',{name:'Réinitialiser cette tenue'}).click();
 }
 for(const name of ['T-shirt Alpine','Le coton essentiel']){
  await select(page,name);
  const image=cabin.getByRole('img',{name:new RegExp('Mannequin femme portant .*'+name,'i')});
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 }
});

test('Un seul mannequin automatique : aucun choix Homme/Femme sur les fiches ni dans les collections',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const product of products.filter(product=>['chemise-riviera','robe-lumiere','hoodie-dune','t-shirt-alpine'].includes(product.slug))){
   await page.goto(`/produit/${product.slug}`);const cabin=room(page);
   await expect(cabin.locator('.fitting-genders button')).toHaveCount(0);
   await expect(cabin.locator('.fitting-fixed-gender')).toHaveCount(1);
   if(product.gender!=='Mixte')await expect(cabin.locator('.fitting-stage')).toHaveAttribute('data-gender',product.gender);
  }
  for(const gender of ['Homme','Femme']){
   await page.goto(`/collection?genre=${gender}`);
   await expect(room(page).locator('.fitting-genders button')).toHaveCount(0);
   await expect(room(page).locator('.fitting-stage')).toHaveAttribute('data-gender',gender);
  }
 }
});

test('Bouton Essayer sur la photo : accueil, fiche t-shirt et hoodie, ordinateur et mobile',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('/');await expect(page.locator('.home-grid .card-try-on').first()).toBeVisible();
  for(const slug of ['t-shirt-alpine','hoodie-noir','hoodie-olive']){
   await page.goto(`/produit/${slug}`);
   const button=page.locator('.gallery-main>.card-try-on');
   await expect(button).toBeVisible();
   const gallery=await page.locator('.gallery-main').boundingBox(),box=await button.boundingBox();
   expect(box!.x+box!.width).toBeLessThanOrEqual(gallery!.x+gallery!.width);
   expect(box!.y-gallery!.y).toBeLessThan(90);
   const cabin=room(page);
   const gender=await cabin.locator('.fitting-stage').getAttribute('data-gender') as FittingGender;
   const product=products.find(product=>product.slug===slug)!;
   const look=findPreparedLook(gender,[{productId:product.id,color:product.colors[0].name}]);
   const previous=await cabin.locator('.fitting-stage img').getAttribute('src');
   await button.click();await expect(cabin).toHaveAttribute('aria-busy','false');
   if(look) {
    await expect(cabin.locator('.fitting-prepared')).toHaveAttribute('src',look.image);
    await expect(cabin.locator('.fitting-items')).toContainText(product.name);
   } else {
    await expect(cabin.locator('.fitting-photo-unavailable')).toContainText(product.name);
    await expect(cabin.locator('.fitting-stage img')).toHaveAttribute('src',previous!);
    await expect(cabin.locator('.fitting-items')).not.toContainText(product.name);
   }
   await page.screenshot({path:`${process.env.TEMP}/maison-photo-tryon-${slug}-${width}.png`});
  }
 }
});
