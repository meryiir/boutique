import * as THREE from 'three';
import type {Product,Color} from '@/types/product';
import type {FittingGender} from '@/data/prepared-looks';
import {products} from '@/data/products';
import type {Wardrobe} from '../wardrobe';

type Ring={y:number;x:number;z:number};
const ivory=new THREE.MeshStandardMaterial({color:'#ddd5c5',roughness:.43,metalness:.04});
function mesh(geometry:THREE.BufferGeometry,material:THREE.Material){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;return m;}
function ellipse(group:THREE.Group,position:number[],scale:number[],material:THREE.Material){const m=mesh(new THREE.SphereGeometry(1,32,24),material);m.position.set(...position as [number,number,number]);m.scale.set(...scale as [number,number,number]);group.add(m);return m;}
function tube(group:THREE.Group,from:number[],to:number[],r1:number,r2:number,material:THREE.Material,open=false){const a=new THREE.Vector3(...from as [number,number,number]),b=new THREE.Vector3(...to as [number,number,number]);const m=mesh(new THREE.CylinderGeometry(r2,r1,a.distanceTo(b),28,8,open),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());group.add(m);return m;}
function line(group:THREE.Group,points:number[][],radius:number,material:THREE.Material){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));group.add(mesh(new THREE.TubeGeometry(curve,32,radius,7,false),material));}
function ring(group:THREE.Group,y:number,x:number,z:number,r:number,material:THREE.Material){const points=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [Math.sin(a)*x,y,Math.cos(a)*z];});line(group,points,r,material);}
function loft(rings:Ring[],fold=.002){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],count=64;
 rings.forEach((ring,j)=>{for(let i=0;i<=count;i++){const u=i/count,a=u*Math.PI*2-Math.PI,wave=1+Math.sin(a*12+ring.y*4)*fold;positions.push(Math.sin(a)*ring.x*wave,ring.y+Math.sin(a*6)*fold*.12,Math.cos(a)*ring.z*wave);uv.push(u,j/(rings.length-1));}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){const a=j*(count+1)+i,b=a+count+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function material(color:Color,product?:Product){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle=color.hex;ctx.fillRect(0,0,256,512);
 // Procedural fabric and motifs are approximations, not photographs of the article.
 const pixels=ctx.getImageData(0,0,256,512);for(let i=0;i<pixels.data.length;i+=4){const n=(Math.sin(i*1.618)*43758.5453)%1;for(let channel=0;channel<3;channel++)pixels.data[i+channel]=Math.max(0,Math.min(255,pixels.data[i+channel]+n*5));}ctx.putImageData(pixels,0,0);
 if(product?.slug==='chemise-riviera'){ctx.fillStyle='#ded8c5';for(let x=0;x<256;x+=8)ctx.fillRect(x,0,3,512);}
 if(product?.slug==='t-shirt-wild-cards'){ctx.strokeStyle='#3e3435';ctx.lineWidth=1.1;for(const [x,y,r] of [[142,335,-.16],[150,329,.2]]){ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.strokeRect(-5,-12,10,24);ctx.restore();}}
 if(product?.slug==='t-shirt-alpine'){ctx.fillStyle='#c0bfa6';ctx.fillRect(112,320,32,40);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(112,352-i*5);for(let x=112;x<=144;x+=4)ctx.lineTo(x,340-i*6+Math.sin(x*.6+i)*6);ctx.lineTo(144,360);ctx.lineTo(112,360);ctx.fillStyle=['#8b674c','#6a765f','#a8a88b'][i];ctx.fill();}}
 if(product?.slug==='hoodie-bordeaux'){ctx.strokeStyle='#e2d2ac';ctx.lineWidth=1;for(let flower=0;flower<3;flower++){const x=143+flower*7,y=340+flower*20;for(let petal=0;petal<8;petal++){const a=petal/8*Math.PI*2;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*4,y+Math.sin(a)*7,3,7,a,0,Math.PI*2);ctx.stroke();}}}
 if(product?.slug==='hoodie-cobalt'){ctx.strokeStyle='#0c2f81';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(146,345);ctx.lineTo(151,335);ctx.lineTo(156,345);ctx.lineTo(151,355);ctx.closePath();ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 return new THREE.MeshStandardMaterial({map:texture,roughness:product?.slug==='robe-sillage'?.35:.85,metalness:product?.slug==='robe-sillage'?.06:0,side:THREE.DoubleSide});
}
function shapePlate(group:THREE.Group,points:number[][],z:number,material:THREE.Material){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,steps:1});const m=mesh(g,material);m.position.z=z;group.add(m);}
function mannequin(gender:FittingGender){const group=new THREE.Group(),male=gender==='Homme',w=male?.205:.175;
 group.add(mesh(loft([{y:.88,x:.12,z:.085},{y:1,x:male?.16:.175,z:.105},{y:1.12,x:male?.15:.125,z:.09},{y:1.32,x:w,z:male?.12:.115},{y:1.46,x:w,z:.10},{y:1.51,x:.11,z:.075},{y:1.54,x:.055,z:.055}],0),ivory));
 tube(group,[0,1.49,0],[0,1.63,0],.052,.047,ivory);ellipse(group,[0,1.71,.004],[.082,.115,.083],ivory);
 for(const sign of [-1,1]){
  tube(group,[sign*.08,.96,0],[sign*.09,.55,0],.073,.052,ivory);ellipse(group,[sign*.09,.55,0],[.052,.055,.055],ivory);tube(group,[sign*.09,.55,0],[sign*.10,.12,.01],.052,.03,ivory);ellipse(group,[sign*.10,.065,.055],[.041,.038,.10],ivory);
  ellipse(group,[sign*(w+.015),1.435,0],[.052,.052,.05],ivory);tube(group,[sign*(w+.018),1.44,0],[sign*.28,1.16,.005],.051,.038,ivory);ellipse(group,[sign*.28,1.16,.005],[.037,.042,.038],ivory);tube(group,[sign*.28,1.16,.005],[sign*.33,.95,.03],.038,.026,ivory);ellipse(group,[sign*.337,.90,.035],[.033,.062,.022],ivory);
  for(let finger=0;finger<4;finger++){const x=sign*(.316+finger*.013);tube(group,[x,.88,.039],[x+sign*.008,.835+Math.abs(finger-1.5)*.006,.044],.006,.004,ivory);}tube(group,[sign*.315,.93,.04],[sign*.30,.88,.065],.01,.006,ivory);
 }
 group.name=`mannequin-${gender}`;return group;
}
function trousers(group:THREE.Group,p:Product,m:THREE.Material,male:boolean){const wide=p.slug==='pantalon-dune'||p.category==='Ensembles',loose=p.slug==='pantalon-rivage',hem=wide?.09:loose?.055:.046;
 group.add(mesh(loft([{y:.87,x:.17,z:.11},{y:.98,x:male?.175:.185,z:.125},{y:1.08,x:male?.155:.145,z:.104}],.005),m));
 for(const sign of [-1,1]){const leg=mesh(loft([{y:.13,x:hem,z:hem*.8},{y:.53,x:wide?.105:.07,z:.075},{y:.87,x:.098,z:.112},{y:.95,x:.09,z:.104}],.009),m);leg.position.x=sign*.086;group.add(leg);}
 ring(group,1.07,male?.156:.146,.106,.009,m);const detail=new THREE.MeshStandardMaterial({color:'#665d4b',roughness:.5});ellipse(group,[0,1.065,.114],[.008,.008,.003],detail);
 for(const sign of [-1,1])line(group,[[sign*.12,1.05,.075],[sign*.15,.98,.10],[sign*.16,.92,.10]],.002,detail);
}
function sleeves(group:THREE.Group,m:THREE.Material,male:boolean,short:boolean,extra=0,balloon=false){const w=male?.205:.175;
 for(const sign of [-1,1]){const from=[sign*(w-.008),1.45,0],to=short?[sign*.264,1.26,.004]:[sign*.328,.97,.026];const sleeve=tube(group,from,to,.092+extra,short?.095+extra:balloon?.07:.047+extra,m,true);if(balloon&&!short){ellipse(group,[sign*.29,1.12,.012],[.083,.14,.072],m);}if(!short)tube(group,[sign*.324,1.005,.025],[sign*.331,.96,.03],.048+extra,.045+extra,m);sleeve.name=short?'short-sleeve':'long-sleeve';}
}
function hoodie(group:THREE.Group,m:THREE.Material,p:Product,male:boolean,outer=false){const w=(male?.235:.213)+(outer?.02:0),crop=['hoodie-dune','hoodie-studio','hoodie-rosee','hoodie-cobalt'].includes(p.slug),hem=crop?1.12:1.01;
 group.add(mesh(loft([{y:hem,x:w-.035,z:.135},{y:hem+.06,x:w-.018,z:.145},{y:1.3,x:w,z:.145},{y:1.46,x:w,z:.125},{y:1.49,x:w-.012,z:.11},{y:1.52,x:.068,z:.075}],.007),m));sleeves(group,m,male,false,outer?.025:.01,['hoodie-dune','hoodie-studio','hoodie-rosee','hoodie-cobalt'].includes(p.slug));ring(group,hem+.015,w-.033,.137,.009,m);
 if(p.slug!=='sweat-horizon'){
  // Hood is a real open shell behind the neck, with an opening at the front.
  const hood=mesh(new THREE.SphereGeometry(1,40,24,Math.PI*.34,Math.PI*1.32,0,Math.PI*.85),m);hood.scale.set(.13,.16,.14);hood.position.set(0,1.51,-.045);hood.rotation.y=Math.PI;group.add(hood);
  if(!['hoodie-dune','hoodie-texture','hoodie-cobalt','hoodie-rosee','hoodie-indigo'].includes(p.slug))for(const sign of [-1,1])line(group,[[sign*.043,1.49,.082],[sign*.051,1.4,.146],[sign*.054,1.29,.151]],.0035,m);
 }
 const zip=['hoodie-olive','hoodie-rosee'].includes(p.slug),detail=new THREE.MeshStandardMaterial({color:'#b4afa2',metalness:.6,roughness:.4});
 if(zip){line(group,[[0,hem,.142],[0,1.28,.15],[0,1.49,.085]],.004,detail);for(const sign of [-1,1])shapePlate(group,[[sign*.055,1.10],[sign*.12,1.13],[sign*.14,1.21],[sign*.09,1.19]],.144,m);}
 else if(p.slug!=='hoodie-dune'&&p.slug!=='hoodie-texture')shapePlate(group,[[-.12,hem+.04],[.12,hem+.04],[.125,hem+.13],[.075,hem+.18],[-.075,hem+.18],[-.125,hem+.13]],.15,m);
 if(p.slug==='hoodie-olive')shapePlate(group,[[.08,1.29],[.17,1.29],[.17,1.40],[.08,1.40]],.153,m);
 if(p.slug==='hoodie-noir'||p.slug==='hoodie-indigo')for(const offset of [0,.07])line(group,[[-w*.8,1.34-offset,.10],[-.09,1.38-offset,.143],[0,1.36-offset,.149],[.09,1.38-offset,.143],[w*.8,1.34-offset,.10]],.002,m);
}
function shirt(group:THREE.Group,m:THREE.Material,p:Product,male:boolean,outer=false){const tee=p.category==='T-shirts',short=tee||p.slug==='chemise-riviera'||p.category==='Ensembles',crop=p.slug==='t-shirt-wild-cards',w=(male?.224:.198)+(outer?.025:0)-(p.slug==='le-coton-essentiel'?.016:0),hem=crop?1.12:p.slug==='le-coton-essentiel'?1.04:outer?.98:1.01;
 group.add(mesh(loft([{y:hem,x:w-.012,z:outer?.16:.135},{y:1.13,x:w-.027,z:outer?.15:.125},{y:1.30,x:w,z:outer?.16:.144},{y:1.46,x:w,z:.125},{y:1.49,x:w-.012,z:.11},{y:1.53,x:.061,z:.062}],.004),m));sleeves(group,m,male,short,outer?.025:0,p.slug==='chemise-aube');
 ring(group,1.53,.062,.064,.006,m);
 if(!tee){const button=new THREE.MeshStandardMaterial({color:outer?'#4a4238':'#c3bba7',metalness:.1,roughness:.5});for(let y=1.08;y<1.43;y+=.066)ellipse(group,[0,y,outer?.165:.148],[.006,.006,.003],button);
  shapePlate(group,[[-.055,1.53],[-.10,1.46],[-.04,1.40],[0,1.48]],.105,m);shapePlate(group,[[.055,1.53],[.10,1.46],[.04,1.40],[0,1.48]],.105,m);
  if(p.slug!=='chemise-aube')shapePlate(group,[[.055,1.27],[.13,1.27],[.13,1.37],[.055,1.37]],outer?.166:.149,m);
 }
 if(outer&&p.slug!=='veste-nomade'){shapePlate(group,[[-.06,1.51],[-.12,1.40],[-.055,1.32],[0,1.18]],.17,m);shapePlate(group,[[.06,1.51],[.12,1.40],[.055,1.32],[0,1.18]],.17,m);for(const sign of [-1,1])shapePlate(group,[[sign*.07,1.07],[sign*.17,1.07],[sign*.17,1.10],[sign*.07,1.10]],.166,m);}
}
function dress(group:THREE.Group,m:THREE.Material,p:Product){const satin=p.slug==='robe-sillage',shirtDress=p.slug==='robe-patio',end=satin?.20:.24;
 group.add(mesh(loft([{y:end,x:satin?.25:.36,z:satin?.18:.25},{y:.60,x:satin?.22:.29,z:.18},{y:.92,x:.183,z:.14},{y:1.10,x:.137,z:.10},{y:1.28,x:.18,z:.13},{y:1.38,x:.175,z:.115}],.013),m));
 if(shirtDress){shirt(group,m,p,false);ring(group,1.11,.145,.112,.012,m);line(group,[[0,1.11,.13],[.09,1.12,.14],[.02,1.04,.16],[.11,.94,.16]],.012,m);}
 else for(const sign of [-1,1]){const points=Array.from({length:20},(_,i)=>{const a=i/19*Math.PI;return [sign*.125,1.37+Math.sin(a)*.14,Math.cos(a)*.117];});line(group,points,satin?.006:.014,m);}
}
function accessories(group:THREE.Group,m:THREE.Material,p:Product){if(p.slug==='echarpe-nuage'){
 for(const sign of [-1,1]){const scarf=mesh(new THREE.BoxGeometry(.105,.48,.025,4,12,2),m);scarf.position.set(sign*.08,1.28,.16);scarf.rotation.z=sign*.09;group.add(scarf);for(let i=0;i<9;i++)line(group,[[sign*.08-.045+i*.011,1.04,.17],[sign*.08-.045+i*.011,1,.17]],.002,m);}ring(group,1.52,.085,.09,.025,m);return;}
 const tote=p.slug==='cabas-quotidien',x=tote?.37:.23,y=tote?.60:.96,z=tote?.06:.14;
 const bag=mesh(new THREE.BoxGeometry(tote?.30:.22,tote?.29:.16,.08,5,5,3),m);bag.position.set(x,y,z);group.add(bag);
 const leather=new THREE.MeshStandardMaterial({color:tote?'#4e3429':'#8d542d',roughness:.5});
 if(tote)for(const depth of [-.035,.035])line(group,[[x-.10,y+.13,z+depth],[x-.07,y+.33,z+depth],[x+.07,y+.33,z+depth],[x+.10,y+.13,z+depth]],.012,leather);
 else {line(group,[[x,y+.06,z],[.15,1.28,.16],[-.15,1.49,.08],[-.17,1.45,-.10],[.15,1.05,-.14],[x,y+.06,z-.05]],.009,leather);shapePlate(group,[[x-.10,y+.065],[x+.10,y+.065],[x+.09,y-.012],[x-.09,y-.012]],z+.043,m);ellipse(group,[x,y-.005,z+.055],[.016,.018,.004],new THREE.MeshStandardMaterial({color:'#b69b5c',metalness:.7,roughness:.3}));}
}
export function buildGarment(product:Product,color:Color,gender:FittingGender){const group=new THREE.Group(),male=gender==='Homme',m=material(color,product);group.name=product.id;group.userData={productId:product.id,color:color.name,representation:'procedural-simplified'};
 if(product.category==='Pantalons')trousers(group,product,m,male);
 else if(product.category==='Robes')dress(group,m,product);
 else if(product.category==='Accessoires')accessories(group,m,product);
 else if(product.category==='Hoodies')hoodie(group,m,product,male);
 else if(product.category==='Ensembles'){trousers(group,product,m,male);if(product.slug==='ensemble-heure-douce')hoodie(group,m,product,male);else shirt(group,m,product,male);}
 else shirt(group,m,product,male,product.category==='Vestes');
 return group;
}
export function buildFigure(gender:FittingGender,wardrobe:Wardrobe){const group=new THREE.Group();group.add(mannequin(gender));for(const item of Object.values(wardrobe)){const p=products.find(p=>p.id===item.productId),color=p?.colors.find(c=>c.name===item.color);if(p&&color)group.add(buildGarment(p,color,gender));}return group;}
export function disposeFigure(group:THREE.Object3D){const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();group.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])if(m!==ivory)materials.add(m);}});for(const m of materials){if(m instanceof THREE.MeshStandardMaterial&&m.map)textures.add(m.map);m.dispose();}for(const texture of textures)texture.dispose();}
