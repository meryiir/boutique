import type { CSSProperties } from 'react';
import type { Product } from '@/types/product';

type Gender='Femme'|'Homme';
// Landmarks are normalized to each source photograph, not its CSS box.
// neck is the top of the fabric at the centre; hem is the bottom of the fabric.
const baseNecks=[.19,.31,.15,.23,.14,.20,.16,.14,.15,.18,.16,.15,.15,.14,.14,.22,.17,.13,.15,.15,.15,0,.14,0];
const variantNecks=[.20,.33,.18,.24,.15,.20,.15,.15,.17,.18,.17,.16,.16,.15,.15,.22,.17,.15,.17,.16,.16,0,.13,0];
function pct(value:number){return `${Math.round(value*10000)/100}%`;}
export function fittingGeometry(product:Product,color:number,gender:Gender):CSSProperties {
 const category=product.category,src=product.colors[color].image;
 const index=product.id.startsWith('edit-')?Number(product.id.slice(5))-1:24;
 const isVariant=src.includes('/colorways/');
 const neck=index<24?(isVariant?variantNecks:baseNecks)[index]:.14;
 const man=gender==='Homme',neckAnchor=man?.177:.175;
 let width=man?.76:.68,left=(1-width)/2,top=0,height=.5,clip='none';
 if(category==='Accessoires'){
  if(product.name.includes('Écharpe'))return {left:'35%',top:'17%',width:'30%',height:'37%',clipPath:`polygon(0 20%,30% 20%,30% 14%,70% 14%,70% 20%,100% 20%,100% 100%,0 100%)`};
  return {left:'63%',top:'44%',width:'29%',height:'24%',clipPath:'none'};
 }
 if(category==='Pantalons'){
  const hem=.99;top=.445;height=(.96-top)/(hem-neck);top-=neck*height;
  width=man?.85:.80;left=(1-width)/2;
  clip=`inset(${pct(neck)} 0 0)`;
 }else{
  const isFull=['Robes','Ensembles'].includes(category),isShort=product.slug==='t-shirt-wild-cards'||product.slug==='hoodie-studio';
  const hem=product.slug==='t-shirt-wild-cards'?.89:.99;
  const end=isFull?.91:isShort?.445:category==='Vestes'?.515:category==='Chemises'?.51:category==='Hoodies'?.515:.52;
  const anchor=category==='Robes'?.265:neckAnchor;
  height=(end-anchor)/(hem-neck);top=anchor-neck*height;
  if(category==='Vestes'){width=man?.69:.62;left=(1-width)/2;}
  if(isFull){width=category==='Robes'?.84:.68;left=(1-width)/2;}
  const edge=Math.max(0,neck-.075),shoulder=Math.max(0,neck-.028);
  // Follow the collar rather than slicing the whole neckline horizontally.
  // The centre notch masks the hanger; the outer points retain shoulder fabric.
  clip=`polygon(0 ${pct(edge)},34% ${pct(edge)},38% ${pct(shoulder)},42% ${pct(neck)},58% ${pct(neck)},62% ${pct(shoulder)},66% ${pct(edge)},100% ${pct(edge)},100% 100%,0 100%)`;
  if(category==='Robes')clip=`polygon(0 ${pct(neck)},32% ${pct(neck)},35% ${pct(neck-.10)},39% ${pct(neck-.10)},42% ${pct(neck)},58% ${pct(neck)},61% ${pct(neck-.10)},65% ${pct(neck-.10)},68% ${pct(neck)},100% ${pct(neck)},100% 100%,0 100%)`;
 }
 return {left:pct(left),top:pct(top),width:pct(width),height:pct(height),clipPath:clip};
}
