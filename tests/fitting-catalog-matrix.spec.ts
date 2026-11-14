import {expect,test} from '@playwright/test';
import {products} from '../data/products';
import {findPreparedLook} from '../data/prepared-looks';

for (const gender of ['Femme','Homme'] as const) for (const entry of ['carte','aperçu rapide'] as const) {
  test('Inventaire en navigateur — '+gender+' — '+entry,async({page},testInfo)=>{
    test.setTimeout(600000);
    await page.emulateMedia({reducedMotion:'reduce'});
    const mobile=entry==='aperçu rapide';
    if(mobile) await page.setViewportSize({width:390,height:844});
    await page.goto('/collection?genre='+gender,{waitUntil:'networkidle'});
    if(mobile) await page.getByRole('button',{name:'Ouvrir la cabine',exact:true}).click();
    while(await page.getByRole('button',{name:'Découvrir la suite'}).count())await page.getByRole('button',{name:'Découvrir la suite'}).click();
    const records=[];
    const cabin=page.locator('.fitting-room');
    for(const product of products.filter(p=>p.gender==='Mixte'||p.gender===gender)){
      const card=page.locator('.product-card').filter({has:page.getByRole('link',{name:product.name,exact:true})});
      for(const color of product.colors){
        const reset=cabin.getByRole('button',{name:'Réinitialiser cette tenue'});
        if(await reset.isEnabled()){await reset.click();await expect(cabin.locator('.fitting-items li')).toHaveCount(0);}
        await card.getByRole('button',{name:product.name+', couleur '+color.name,exact:true}).click();
        const look=findPreparedLook(gender,[{productId:product.id,color:color.name}]);
        if(entry==='carte') {
          if(look)await card.locator('.card-try-on').click();
          else await expect(card.locator('.card-try-on')).toBeDisabled();
        }
        else {
          await card.locator('.quick-add').click();
          const dialog=page.getByRole('dialog');
          if(look) {
            await dialog.getByRole('button',{name:'Essayer sur le mannequin',exact:true}).click();
            await expect(dialog).toHaveCount(0);
          }
          else {
            await expect(dialog.getByRole('button',{name:'Essayage indisponible',exact:true})).toBeDisabled();
            await expect(dialog.getByText(/Aperçu indisponible pour cette variante/)).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
          }
        }
        await expect(cabin).toHaveAttribute('aria-busy','false');
        if(look){
          const img=cabin.locator('.fitting-prepared');
          await expect(img).toHaveAttribute('src',look.image);
          await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
          await expect(cabin.locator('.fitting-items')).toContainText(color.name);
        }else{
          await expect(cabin.locator('.fitting-items li')).toHaveCount(0);
        }
        records.push({produit:product.slug,couleur:color.name,mannequin:gender,visuel:look?.image??null});
      }
    }
    await testInfo.attach('matrice.json',{body:JSON.stringify(records,null,2),contentType:'application/json'});
  });
}
