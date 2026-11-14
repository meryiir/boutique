import {expect,test} from '@playwright/test';
import {products} from '../data/products';
import {findPreparedLook} from '../data/prepared-looks';

const stage='.fitting-stage';
async function expectPhoto(page:import('@playwright/test').Page,src:string){
  const image=page.locator(stage+' img');
  await expect(image).toHaveAttribute('src',src);
  await expect.poll(()=>image.evaluate(el=>{
    const img=el as HTMLImageElement;
    return img.complete&&img.currentSrc===img.src&&img.naturalWidth>0;
  })).toBe(true);
}

for (const width of [1440,390]) {
  test.describe('Studio '+width,()=>{
    test.use({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
    test('Fragment : changer la couleur portée, sortir, revenir et recharger',async({page},testInfo)=>{
      await page.goto('/produit/hoodie-indigo');
      await page.locator('#product-try-on').click();
      await expectPhoto(page,'/images/fitting/prepared/hoodie-indigo-v1.webp');
      await page.getByRole('button',{name:'Couleur Sable',exact:true}).click();
      await expectPhoto(page,'/images/fitting/prepared/hoodie-indigo-homme-sable.webp');
      await expect(page.getByRole('button',{name:'Couleur Sable',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('.fitting-items')).toContainText('Sable');
      await page.locator('.fitting-room').screenshot({path:testInfo.outputPath('fragment-sable.png')});
      await page.locator('.header .logo').click();
      await expect(page).toHaveURL(/\/$/);
      await page.goBack();
      await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
      await page.goForward();
      await expect(page).toHaveURL(/\/$/);
      await page.goBack();
      await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
      await page.locator('#product-try-on').click();
      await expect(page.locator('.fitting-items li')).toHaveCount(1);
      await page.reload();
      await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
    });
    test('Filtres et ancre conservent la tenue, changer de genre la vide',async({page})=>{
      await page.goto('/collection?genre=Femme');
      await page.getByRole('button',{name:/^Essayer T-shirt Alpine,/}).click();
      await expectPhoto(page,'/images/fitting/prepared/t-shirt-alpine-femme-v1.webp');
      await page.getByLabel('Trier les produits').selectOption('prix-asc');
      await expectPhoto(page,'/images/fitting/prepared/t-shirt-alpine-femme-v1.webp');
      await page.evaluate(()=>location.hash='main');
      await expect(page).toHaveURL(/#main$/);
      await expectPhoto(page,'/images/fitting/prepared/t-shirt-alpine-femme-v1.webp');
      await page.getByRole('button',{name:'Homme',exact:true}).click();
      await expect(page.locator(stage)).toHaveAttribute('data-gender','Homme');
      await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
      await page.getByRole('button',{name:'Femme',exact:true}).click();
      await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
    });
  });
}

test('Un chargement interrompu par une navigation ne restaure aucun article',async({page})=>{
  await page.goto('/collection?genre=Femme');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/hoodie-studio-v1.webp',async route=>{
    await gate;
    await route.continue().catch(()=>{});
  });
  const requested=page.waitForRequest('**/hoodie-studio-v1.webp');
  try {
    await page.getByRole('button',{name:/^Essayer Hoodie Studio,/}).click();
    await requested;
    await expect(page.locator('.fitting-room')).toHaveAttribute('aria-busy','true');
    await page.locator('.header .logo').click();
    await expect(page).toHaveURL(/\/$/);
  } finally {release();}
  await page.goBack();
  await expect(page.locator(stage)).toHaveAttribute('data-prepared-look','none');
});

test('Le showroom transmet uniquement le hoodie demandé et sa couleur initiale',async({page})=>{
  test.setTimeout(90000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const [index,product] of products.filter(p=>p.collection==='Édition Hoodie').entries()){
    await page.goto('/');
    const rack=page.locator('#wardrobe');
    for(let i=0;i<index;i++)await rack.getByRole('button',{name:'Pièce suivante'}).click();
    await rack.getByRole('link',{name:'Essayer',exact:true}).click();
    const panel=page.locator(stage);
    await expect(panel).not.toHaveAttribute('data-prepared-look','none');
    const gender=await panel.getAttribute('data-gender') as 'Femme'|'Homme';
    const look=findPreparedLook(gender,[{productId:product.id,color:product.colors[0].name}]);
    expect(look).toBeTruthy();
    await expectPhoto(page,look!.image);
    await expect(page.locator('.fitting-items li')).toHaveCount(1);
    await expect(page.locator('.fitting-items')).toContainText(product.name);
    await expect(page).not.toHaveURL(/essayer=/);
    await page.reload();
    await expect(panel).toHaveAttribute('data-prepared-look','none');
  }
});
test('Les compositions signalées utilisent leur rendu exact',async({page},testInfo)=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [genre,names,asset] of [
    ['Femme',['Chemise Aube','Pantalon Dune','Veste Atelier'],'aube-atelier-dune'],
    ['Femme',['Pantalon Dune','T-shirt Wild Cards'],'wild-dune'],
    ['Homme',['Chemise Medina','Pantalon Épure'],'medina-epure'],
    ['Homme',['Pantalon Rivage','Chemise Medina'],'medina-rivage'],
    ['Homme',['Chemise Medina','Veste Nomade'],'medina-nomade'],
    ['Homme',['Cabas Quotidien','Chemise Medina'],'medina-cabas'],
  ] as const) {
    await page.goto('/collection?genre='+genre);
    while(await page.getByRole('button',{name:'Découvrir la suite'}).count())await page.getByRole('button',{name:'Découvrir la suite'}).click();
    for(const name of names){
      await page.getByRole('button',{name:new RegExp('^Essayer '+name+',')}).click();
      await expect(page.locator('.fitting-room')).toHaveAttribute('aria-busy','false');
    }
    await expectPhoto(page,'/images/fitting/prepared/'+asset+'-v1.webp');
    await expect(page.locator('.fitting-items li')).toHaveCount(names.length);
    if(asset==='aube-atelier-dune'){
      await page.locator('.fitting-room').screenshot({path:testInfo.outputPath('aube-atelier-dune.png')});
      await page.getByRole('button',{name:'Retirer Pantalon Dune de la sélection'}).click();
      await expectPhoto(page,'/images/fitting/prepared/aube-atelier-v1.webp');
    }
  }
});
test('Recommandation : seul l’article demandé est essayé sur la nouvelle fiche',async({page})=>{
  await page.goto('/produit/chemise-aube');
  await page.locator('#product-try-on').click();
  await expectPhoto(page,'/images/fitting/prepared/chemise-aube-v1.webp');
  const suggested=page.locator('.related .product-card').filter({has:page.getByRole('link',{name:'Chemise Medina',exact:true})});
  await suggested.getByRole('link',{name:'Essayer Chemise Medina sur le mannequin'}).click();
  await expectPhoto(page,'/images/fitting/prepared/chemise-medina-v1.webp');
  await expect(page.locator('.fitting-items li')).toHaveCount(1);
  await expect(page.locator('.fitting-items')).toContainText('Chemise Medina');
});
