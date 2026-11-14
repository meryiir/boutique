import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Pages principales : aucune erreur d’accessibilité grave sur ordinateur et mobile',async({page},testInfo)=>{
  test.setTimeout(180000);
  const reports=[];
  for(const width of [1440,390])for(const route of ['/','/collection','/produit/veste-atelier','/maison','/informations','/checkout']){
    await page.setViewportSize({width,height:900});
    await page.goto(route);
    const result=await new AxeBuilder({page}).analyze();
    reports.push({width,route,violations:result.violations});
    expect.soft(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious').map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),`${route} à ${width}px`).toEqual([]);
  }
  await testInfo.attach('accessibilite.json',{body:JSON.stringify(reports,null,2),contentType:'application/json'});
});
