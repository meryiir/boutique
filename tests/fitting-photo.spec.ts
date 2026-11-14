import {test, expect, type Page} from '@playwright/test';
import {addToWardrobe} from '../components/fitting/wardrobe';
import {products} from '../data/products';

const room = (page:Page) => page.getByRole('complementary',{name:'Cabine d’essayage'});
const card = (page:Page,name:string) => page.locator('.product-card').filter({has:page.getByRole('link',{name,exact:true})});
const tryPiece = (page:Page,name:string) => card(page,name).locator('.card-try-on').click();

async function worn(page:Page, image:string, names:string[]) {
  const cabin = room(page);
  const photo = cabin.locator('.fitting-prepared');
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute('src',new RegExp('/'+image+'-v1\\.webp$'));
  await expect.poll(()=>photo.evaluate(node=>{
    const img = node as HTMLImageElement;
    return img.complete && img.currentSrc === img.src && img.naturalWidth > 0;
  })).toBe(true);
  await expect(cabin.locator('.fitting-items li')).toHaveCount(names.length);
  for (const name of names) await expect(cabin.getByRole('link',{name:new RegExp(name)})).toBeVisible();
  await expect(cabin.locator('canvas')).toHaveCount(0);
  await expect(cabin.getByRole('button',{name:/Tourner le mannequin/})).toHaveCount(0);
}

test('Une robe remplace le haut et le pantalon, la veste et les accessoires restent compatibles',()=>{
  const get = (id:string) => products.find(product=>product.id===id)!;
  let outfit = {};
  for (const id of ['edit-08','edit-13','edit-10','edit-23','edit-16']) {
    const p=get(id);
    outfit=addToWardrobe(outfit,p,p.colors[0].name);
  }
  expect(outfit).toMatchObject({full:{productId:'edit-16'},outer:{productId:'edit-10'},scarf:{productId:'edit-23'}});
  expect(Object.keys(outfit).sort()).toEqual(['full','outer','scarf']);
  expect(Object.keys(addToWardrobe(outfit,get('edit-13'),'Sable')).sort()).toEqual(['bottom','outer','scarf']);
});

for (const mobile of [false,true]) {
  test.describe(mobile?'Téléphone tactile':'Ordinateur',()=>{
    test.use({viewport:{width:mobile?390:1440,height:900},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
    test('Outfit photo synchronisé : ordre, remplacements, veste, couleur et navigation',async({page},testInfo)=>{
      test.setTimeout(90000);
      await page.goto('/collection?genre=Femme');
      await tryPiece(page,'Hoodie Studio');
      await worn(page,'hoodie-studio',['Hoodie Studio']);
      await tryPiece(page,'Pantalon Rivage');
      await worn(page,'studio-rivage',['Hoodie Studio','Pantalon Rivage']);
      await tryPiece(page,'Pantalon Dune');
      await worn(page,'studio-dune',['Hoodie Studio','Pantalon Dune']);
      await tryPiece(page,'Chemise Aube');
      await worn(page,'aube-dune',['Chemise Aube','Pantalon Dune']);
      await tryPiece(page,'Pantalon Rivage');
      await worn(page,'aube-rivage-femme',['Chemise Aube','Pantalon Rivage']);
      await tryPiece(page,'Veste Atelier');
      await worn(page,'aube-atelier-rivage',['Chemise Aube','Pantalon Rivage','Veste Atelier']);
      await room(page).locator('.fitting-stage').screenshot({path:testInfo.outputPath('tenue-femme.png')});
      await room(page).getByRole('button',{name:'Retirer Veste Atelier de la sélection'}).click();
      await worn(page,'aube-rivage-femme',['Chemise Aube','Pantalon Rivage']);
      await tryPiece(page,'Chemise Aube');
      await worn(page,'aube-rivage-femme',['Chemise Aube','Pantalon Rivage']);
      await room(page).getByRole('link',{name:/Chemise Aube/}).click();
      await expect(page).toHaveURL(/produit\/chemise-aube/);
      if(mobile) await room(page).getByRole('button',{name:'Ouvrir la cabine'}).click();
      await expect(room(page).locator('.fitting-avatar')).toBeVisible();
      await page.locator('#product-try-on').click();
      await worn(page,'chemise-aube',['Chemise Aube']);
      await page.getByRole('button',{name:'Couleur Rose',exact:true}).click();
      await expect(room(page).getByRole('status')).toContainText('aperçu photo indisponible');
      await worn(page,'chemise-aube',['Chemise Aube']);
      await expect(page.getByRole('button',{name:'Couleur Ivoire',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(room(page).locator('[data-slot=top]')).toContainText('Ivoire');
      await page.locator('.breadcrumb').getByRole('link',{name:'La collection',exact:true}).click();
      if(mobile) await room(page).getByRole('button',{name:'Ouvrir la cabine'}).click();
      await expect(room(page).locator('.fitting-avatar')).toBeVisible();
      await page.getByRole('button',{name:'Femme',exact:true}).click();
      await tryPiece(page,'Pantalon Rivage');
      await worn(page,'pantalon-rivage-femme',['Pantalon Rivage']);
      await card(page,'Hoodie Studio').getByRole('button',{name:/Aperçu & ajout rapide/}).click();
      await page.getByRole('dialog').getByRole('button',{name:'Essayer sur le mannequin',exact:true}).click();
      await worn(page,'studio-rivage',['Hoodie Studio','Pantalon Rivage']);
      await card(page,'T-shirt Wild Cards').getByRole('button',{name:/Aperçu & ajout rapide/}).click();
      const quick=page.getByRole('dialog');
      await expect(quick.getByRole('button',{name:'Essayage indisponible',exact:true})).toBeDisabled();
      await expect(quick.getByText(/Aperçu indisponible pour cette variante/)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(card(page,'T-shirt Wild Cards').locator('.card-try-on')).toBeDisabled();
      await worn(page,'studio-rivage',['Hoodie Studio','Pantalon Rivage']);
    });

    test('Mannequin automatique et showroom : nouvelle tenue sans report du pantalon',async({page},testInfo)=>{
      await page.goto('/produit/pantalon-epure');
      await expect(room(page).locator('.fitting-stage')).toHaveAttribute('data-gender','Homme');
      await page.locator('#product-try-on').click();
      await worn(page,'pantalon-epure',['Pantalon Épure']);
      await page.goto('/');
      await page.getByRole('button',{name:'01 — Explorer Hoodie Nocturne',exact:true}).click();
      await expect(page).toHaveURL(/hoodie-noir/);
      await page.locator('#product-try-on').click();
      await worn(page,'hoodie-noir',['Hoodie Nocturne']);
      await room(page).locator('.fitting-stage').screenshot({path:testInfo.outputPath('tenue-homme.png')});
      await page.goto('/collection?genre=Femme');
      await expect(room(page).locator('.fitting-stage')).toHaveAttribute('data-gender','Femme');
      await expect(room(page).locator('.fitting-items li')).toHaveCount(0);
      await page.getByRole('button',{name:'Homme',exact:true}).click();
      if(mobile) await room(page).getByRole('button',{name:'Ouvrir la cabine'}).click();
      await expect(room(page).locator('.fitting-avatar')).toBeVisible();
      await expect(room(page).locator('.fitting-items li')).toHaveCount(0);
    });
  });
}

test('Image manquante et clics concurrents : seule la dernière demande valide peut changer la tenue',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/collection?genre=Femme');
  await tryPiece(page,'Hoodie Studio');
  await worn(page,'hoodie-studio',['Hoodie Studio']);

  await page.route('**/studio-dune-v1.webp',route=>route.abort());
  await tryPiece(page,'Pantalon Dune');
  await expect(room(page).getByRole('status')).toContainText('n’a pas pu être chargé');
  await worn(page,'hoodie-studio',['Hoodie Studio']);

  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/studio-rivage-v1.webp',async route=>{
    await gate;
    await route.continue();
  });
  const requested=page.waitForRequest('**/studio-rivage-v1.webp');
  const completed=page.waitForResponse('**/studio-rivage-v1.webp');
  try {
    await tryPiece(page,'Pantalon Rivage');
    await requested;
    await expect(room(page)).toHaveAttribute('aria-busy','true');
    await tryPiece(page,'Pantalon Dune');
    await expect(room(page).getByRole('status')).toContainText('Pantalon Dune');
  } finally {
    release();
  }
  await completed;
  await worn(page,'hoodie-studio',['Hoodie Studio']);
  await expect(room(page)).toHaveAttribute('aria-busy','false');
});
