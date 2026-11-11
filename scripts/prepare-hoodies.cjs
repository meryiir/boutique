const fs = require('fs');
const sharp = require('sharp');
const ids = ['noir','sable','olive','bordeaux','ecru','cobalt','rose','indigo'];

// Extract and register the generated poses; never squash or rotate a photo.
// The top of the substantial hanger body is the fixed suspension point.
async function register(buffer) {
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let top=-1,bottom=0,left=info.width,right=0;
 for(let y=0;y<info.height;y++){
  let count=0;
  for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>100)count++;
  if(count>=7){if(top<0)top=y;bottom=y;}
 }
 if(top<0)throw Error('Empty generated frame');
 // A common asset-pipeline crop removes isolated transparent-matte speckles.
 for(let y=top;y<=bottom;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);}
 let totalX=0,pixels=0;
 for(let y=top;y<Math.min(top+10,info.height);y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>100){totalX+=x;pixels++;}
 return {buffer,left,right,top,bottom,pivot:pixels?totalX/pixels:info.width/2};
}
(async()=>{
 const review=[];
 for(const [index,id] of ids.entries()){
  const source=`public/garments/generated-sources/${id}.png`;
  const meta=await sharp(source).metadata();const poses=[];
  for(let frame=0;frame<8;frame++){
   const col=frame%4,row=Math.floor(frame/4),x=Math.round(col*meta.width/4),y=Math.round(row*meta.height/2);
   const width=Math.round((col+1)*meta.width/4)-x,height=Math.round((row+1)*meta.height/2)-y;
   const buffer=await sharp(source).extract({left:x,top:y,width,height}).png().toBuffer();
   poses.push(await register(buffer));
  }
  // Same scale for all poses in a product preserves the garment's proportions.
  const maxHeight=Math.max(...poses.map(p=>p.bottom-p.top+1));
  const maxHalf=Math.max(...poses.flatMap(p=>[p.pivot-p.left,p.right-p.pivot]));
  const scale=Math.min(402/maxHeight,176/maxHalf);
  const frames=[];
  for(const p of poses){
   const cut=await sharp(p.buffer).extract({left:p.left,top:p.top,width:p.right-p.left+1,height:p.bottom-p.top+1}).resize({width:Math.round((p.right-p.left+1)*scale)}).png().toBuffer();
   const x=Math.max(0,Math.round(192-(p.pivot-p.left)*scale));
   frames.push(await sharp({create:{width:384,height:448,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:cut,left:x,top:12}]).png().toBuffer());
  }
  const dir=`public/garments/hoodie-${id}`;fs.mkdirSync(dir,{recursive:true});
  for(const [filename,frame] of [['profile',0],['front',7]])await sharp(frames[frame]).webp({quality:90}).toFile(`${dir}/${filename}.webp`);
  await sharp({create:{width:1536,height:896,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:i%4*384,top:Math.floor(i/4)*448}))).webp({quality:86}).toFile(`${dir}/atlas.webp`);
  const small=await Promise.all(frames.map(async(input,i)=>({input:await sharp(input).resize(240,280).png().toBuffer(),left:i%4*240,top:Math.floor(i/4)*280})));
  await sharp({create:{width:960,height:560,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(small).webp({quality:82}).toFile(`${dir}/atlas-mobile.webp`);
  fs.writeFileSync(`${dir}/manifest.json`,JSON.stringify({version:1,width:384,height:448,columns:4,frameCount:8,pivot:[.5,12/448],source:{kind:'generated-fashion-concept',tool:'built-in image_gen',poses:'Eight generated coordinated views from profile to front; not a 3D model or manufactured product.',original:`generated-sources/${id}.png`}},null,2));
  review.push({input:await sharp(frames[7]).resize(230,268).png().toBuffer(),left:index%4*240+5,top:Math.floor(index/4)*280+5});
  console.log(id,fs.statSync(`${dir}/atlas.webp`).size,fs.statSync(`${dir}/atlas-mobile.webp`).size);
 }
 await sharp({create:{width:960,height:560,channels:4,background:'#eeeae3'}}).composite(review).png().toFile('docs/hoodie-review.png');
})().catch(e=>{console.error(e);process.exit(1);});
