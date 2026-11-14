const fs=require('fs'),path=require('path'),sharp=require('sharp');
async function run(){
 const paths=[];
 for(const dir of ['images/catalog','images/colorways','garments']){
  for(const f of fs.readdirSync('public/'+dir,{recursive:true,withFileTypes:true})){
   if(!f.isFile()||!(/-(front|back)\.webp$/.test(f.name)||dir==='garments'&&f.name==='front.webp'))continue;
   paths.push(path.join(f.parentPath,f.name));
  }
 }
 for(const src of paths){const output=path.join('public/thumbs',path.relative('public',src));fs.mkdirSync(path.dirname(output),{recursive:true});await sharp(src).resize({width:360,withoutEnlargement:true}).webp({quality:74,alphaQuality:78}).toFile(output);}
 await sharp('public/images/hero-mixte.webp').extract({left:820,top:0,width:760,height:941}).resize(660).webp({quality:81}).toFile('public/images/hero-mixte-mobile.webp');
 await sharp('public/images/campaign.jpg').resize({width:1400,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile('public/images/campaign.webp');
 console.log(paths.length+' thumbnails');
}
run().catch(e=>{console.error(e);process.exitCode=1});
