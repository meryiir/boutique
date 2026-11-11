import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const browserRoot=process.env.LOCALAPPDATA?join(process.env.LOCALAPPDATA,'ms-playwright'):'';
const browser=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (browserRoot&&existsSync(browserRoot)?readdirSync(browserRoot).filter(x=>/^chromium-\d+$/.test(x)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])).map(x=>join(browserRoot,x,'chrome-win64','chrome.exe')).find(existsSync):undefined);
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',fullyParallel:false,workers:1,timeout:45000,expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],use:{baseURL:process.env.BASE_URL||'http://127.0.0.1:3107',headless:true,launchOptions:browser?{executablePath:browser}:{},viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'}});
