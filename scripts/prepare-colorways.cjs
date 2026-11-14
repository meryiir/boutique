const fs=require('fs');
const sharp=require('sharp');

(async()=>{
 fs.mkdirSync('public/images/colorways',{recursive:true});
 const records=JSON.parse(fs.readFileSync('docs/colorway-source-files.json','utf8'));
 const review=[];
 for(const record of records){
  const image=sharp(record.path),meta=await image.metadata();
  for(let variant=0;variant<2;variant++)for(let side=0;side<2;side++){
   const x=Math.round(side*meta.width/2),y=Math.round(variant*meta.height/2);
   const width=Math.round((side+1)*meta.width/2)-x,height=Math.round((variant+1)*meta.height/2)-y;
   const crop=await sharp(record.path).extract({left:x,top:y,width,height}).png().toBuffer();
   const trimmed=await sharp(crop).trim({background:'#00000000',threshold:10}).toBuffer();
   const filename=`public/images/colorways/item-${String(record.index).padStart(2,'0')}-${variant===0?'a':'b'}-${side===0?'front':'back'}.webp`;
   await sharp(trimmed).resize(800,1000,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:89}).toFile(filename);
   if(side===0)review.push({input:await sharp(filename).resize(115,144,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left:record.index%8*250+variant*120+5,top:Math.floor(record.index/8)*160+5});
  }
  console.log(`Product ${record.index}: two colours, four views`);
 }
 await sharp({create:{width:2000,height:640,channels:4,background:'#eeeae3'}}).composite(review).webp({quality:87}).toFile('docs/colorway-review.webp');
})().catch(error=>{console.error(error);process.exit(1);});
