const fs = require('fs');
const sharp = require('sharp');

// Mechanical preparation only: split the two generated studio elevations,
// trim transparent outer margins, resize proportionally and encode as WebP.
async function prepare(record) {
 const meta = await sharp(record.path).metadata();
 const split = Math.round(meta.width / 2);
 const root = `public/images/catalog/product-${String(record.index).padStart(2, '0')}${record.variant ? '-' + record.variant : ''}`;
 for (const [side, offset, width] of [['front', 0, split], ['back', split, meta.width - split]]) {
  const half = await sharp(record.path).extract({left: offset, top: 0, width, height: meta.height}).png().toBuffer();
  const trimmed = await sharp(half).trim({background: '#00000000', threshold: 10}).toBuffer();
  await sharp(trimmed).resize(650, 800, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}}).webp({quality: 87}).toFile(`${root}-${side}.webp`);
 }
 console.log(`product-${record.index}${record.variant ? '-' + record.variant : ''}: front + back ready`);
}

(async () => {
 fs.mkdirSync('public/images/catalog', {recursive: true});
 const records = JSON.parse(fs.readFileSync('docs/catalog-source-files.json', 'utf8'));
 for (const record of records) await prepare(record);
 const cells = [];
 for (let index = 0; index < 24; index++) {
  const input = await sharp(`public/images/catalog/product-${String(index).padStart(2,'0')}-front.webp`).resize(150,185,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  cells.push({input,left:index%6*170+10,top:Math.floor(index/6)*205+10});
 }
 await sharp({create:{width:1020,height:820,channels:4,background:'#eeeae3'}}).composite(cells).webp({quality:88}).toFile('docs/catalog-photoreal-review.webp');
})().catch(error => { console.error(error); process.exit(1); });
