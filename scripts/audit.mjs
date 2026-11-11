import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
const executablePath=process.env.CHROME_PATH||'C:/Users/pc/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe';
const browser=await chromium.launch({executablePath});
const results=[];
for(const route of ['/','/collection','/produit/veste-atelier','/maison','/informations']){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
 await page.goto('http://127.0.0.1:3107'+route,{waitUntil:'networkidle'});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
 const entry={route,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};results.push(entry);console.log(route,JSON.stringify(entry.violations));await context.close();
}
const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:3107');const session=await page.context().newCDPSession(page);await session.send('Performance.enable');const before=await session.send('Performance.getMetrics');await page.locator('#wardrobe').scrollIntoViewIfNeeded();await page.locator('.rack-garment').first().focus();await page.waitForTimeout(1500);const after=await session.send('Performance.getMetrics');const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('atlas')).map(r=>({url:r.name,size:r.transferSize})));results.push({memory:{before,after,resources,decodedAtlasBudgetMobileMiB:2*1440*1400*4/1024/1024,decodedAtlasBudgetDesktopMiB:2*2304*2240*4/1024/1024}});writeFileSync('docs/accessibility-memory.json',JSON.stringify(results,null,2));await browser.close();


