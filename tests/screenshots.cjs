const {chromium}=require('@playwright/test');
const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/pc/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe'});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:3107',{waitUntil:'networkidle'});await p.screenshot({path:'docs/home-desktop.png'});await p.locator('#wardrobe').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);await p.screenshot({path:'docs/rack-desktop.png'});console.log('errors',errors);await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:3107',{waitUntil:'networkidle'});await p.screenshot({path:'docs/home-mobile.png'});await b.close();})();

