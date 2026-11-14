import {test, expect} from '@playwright/test';
import {products} from '../data/products';
import {findPreparedLook} from '../data/prepared-looks';

// Try every catalog variant and verify that unavailable photos leave the studio unchanged.
for (const width of [1440, 390]) {
  test(`Audit des 32 fiches et 97 couleurs dans le studio photo à ${width}px`, async ({page}, testInfo) => {
    test.setTimeout(300000);
    await page.setViewportSize({width, height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    const errors:string[]=[];
    page.on('pageerror', error=>errors.push(error.message));
    const coverage:{article:string;couleur:string;mannequin:string;photo:boolean}[]=[];
    for (const product of products) {
      await page.goto(`/produit/${product.slug}`,{waitUntil:'networkidle'});
      const cabin=page.locator('.fitting-room');
      const reset=cabin.getByRole('button',{name:'Réinitialiser cette tenue',exact:true});
      await expect(page.locator('.product-detail h1')).toHaveText(product.name);
      await expect(cabin).toHaveAttribute('aria-busy','false');
      const open=cabin.getByRole('button',{name:'Ouvrir la cabine',exact:true});
      if(await open.isVisible()) await open.click();
      for (const color of product.colors) {
        if(await reset.isEnabled()) {
          await reset.click();
          await expect(cabin.locator('.fitting-items li')).toHaveCount(0);
        }
        await page.locator('.product-options').getByRole('button',{name:`Couleur ${color.name}`,exact:true}).click();
        await expect(page.locator('.gallery-image')).toHaveAttribute('src',color.image);
        await expect.poll(()=>page.locator('.gallery-image').evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
        await expect(cabin).toHaveAttribute('aria-busy','false');
        const gender=await cabin.locator('.fitting-stage').getAttribute('data-gender') as 'Femme'|'Homme';
        if(product.gender!=='Mixte') expect(gender).toBe(product.gender);
        const look=findPreparedLook(gender,[{productId:product.id,color:color.name}]);
        if(look) {
          await page.locator('.gallery-main>.card-try-on').click();
          await expect(cabin.locator('.fitting-items li')).toHaveCount(1);
          await expect(cabin.locator('.fitting-items')).toContainText(product.name);
          await expect(cabin.locator('.fitting-items')).toContainText(color.name);
          await expect(cabin.locator('.fitting-prepared')).toHaveAttribute('src',look.image);
          await expect.poll(()=>cabin.locator('.fitting-prepared').evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
          await expect(cabin.locator('.fitting-photo-unavailable')).toHaveCount(0);
        } else {
          await expect(cabin.locator('.fitting-avatar')).toBeVisible();
          await expect(page.locator('.gallery-main>.card-try-on')).toBeDisabled();
          await expect(page.locator('#product-try-on')).toBeDisabled();
          await expect(cabin.locator('.fitting-items li')).toHaveCount(0);;
        }
        await expect(cabin.locator('.mannequin-three')).toHaveCount(0);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        coverage.push({article:product.name,couleur:color.name,mannequin:gender,photo:!!look});
      }
    }
    expect(coverage).toHaveLength(97);
    expect(errors).toEqual([]);
    await testInfo.attach('couverture-photo.json',{body:JSON.stringify(coverage,null,2),contentType:'application/json'});
  });
}
