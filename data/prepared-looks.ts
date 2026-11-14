import generatedLooks from './generated-prepared-looks.json';
import coverageLooks from './fitting-coverage-looks.json';
export type FittingGender='Femme'|'Homme';
export type FittingSelection={productId:string;color:string};
export type FittingView='front'|'left'|'right'|'back';
export type PreparedLook={views?:Partial<Record<FittingView,string>>;id:string;gender:FittingGender;items:FittingSelection[];image:string;alt:string;differences:string[]};
// Each asset shows exactly the listed pieces on the specified mannequin.
export const preparedLooks:PreparedLook[]=[...(generatedLooks as PreparedLook[]),...(coverageLooks as PreparedLook[]),{
 id:'wild-cards-rose-femme-v1',gender:'Femme',items:[{productId:'edit-02',color:'Rose'}],
 image:'/images/fitting/wild-cards-rose-femme-v1.webp',
 alt:'Mannequin femme portant le T-shirt Wild Cards rose, coupe ample et courte, motif de deux cartes sur la poitrine',
 differences:['Différences visibles : rose légèrement plus clair, grain du coton plus marqué ; tracé et placement du motif de deux cartes légèrement réinterprétés. Plis et tombé générés.'],
},{
 id:'t-shirt-alpine-femme-v1',gender:'Femme',items:[{productId:'edit-01',color:'Blanc'}],
 image:'/images/fitting/prepared/t-shirt-alpine-femme-v1.webp',
 alt:'Mannequin femme portant le T-shirt Alpine blanc',
 differences:['Le motif paysage, le tombé et les plis du coton sont reconstitués.'],
},{
 id:'le-coton-essentiel-femme-v1',gender:'Femme',items:[{productId:'edit-03',color:'Écru'}],
 image:'/images/fitting/prepared/le-coton-essentiel-femme-v1.webp',
 alt:'Mannequin femme portant le T-shirt Le coton essentiel écru',
 differences:['Le tombé et les plis du coton sont reconstitués.'],
},{
 id:'pantalon-rivage-femme-v1',gender:'Femme',items:[{productId:'edit-15',color:'Olive'}],
 image:'/images/fitting/prepared/pantalon-rivage-femme-v1.webp',
 alt:'Mannequin femme portant le Pantalon Rivage olive',
 differences:['Les plis, les coutures et le tombé du pantalon sont reconstitués.'],
},{
 id:'aube-rivage-femme-v1',gender:'Femme',items:[{productId:'edit-08',color:'Ivoire'},{productId:'edit-15',color:'Olive'}],
 image:'/images/fitting/prepared/aube-rivage-femme-v1.webp',
 alt:'Mannequin femme portant la Chemise Aube ivoire et le Pantalon Rivage olive',
 differences:['Le tombé et les plis des deux pièces sont reconstitués.'],
},{
 id:'atelier-dune-femme-v1',gender:'Femme',items:[{productId:'edit-10',color:'Sable'},{productId:'edit-13',color:'Sable'}],
 image:'/images/fitting/prepared/atelier-dune-femme-v1.webp',
 alt:'Mannequin femme portant la Veste Atelier sable et le Pantalon Dune sable',
 differences:['Le tombé, les plis et les détails du tissu sont reconstitués.'],
},{
 id:'atelier-rivage-femme-v1',gender:'Femme',items:[{productId:'edit-10',color:'Sable'},{productId:'edit-15',color:'Olive'}],
 image:'/images/fitting/prepared/atelier-rivage-femme-v1.webp',
 alt:'Mannequin femme portant la Veste Atelier sable et le Pantalon Rivage olive',
 differences:['Les plis du pantalon et les finitions de la veste sont reconstitués.'],
},
 {"id":"studio-rivage-v1","gender":"Femme","items":[{"productId":"edit-06","color":"Perle"},{"productId":"edit-15","color":"Olive"}],"image":"/images/fitting/prepared/studio-rivage-v1.webp","alt":"Mannequin femme portant le Hoodie Studio perle et le Pantalon Rivage olive","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]},
 {"id":"studio-dune-v1","gender":"Femme","items":[{"productId":"edit-06","color":"Perle"},{"productId":"edit-13","color":"Sable"}],"image":"/images/fitting/prepared/studio-dune-v1.webp","alt":"Mannequin femme portant le Hoodie Studio perle et le Pantalon Dune sable","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]},
 {"id":"nocturne-epure-v1","gender":"Homme","items":[{"productId":"hoodie-noir","color":"Charbon"},{"productId":"edit-14","color":"Anthracite"}],"image":"/images/fitting/prepared/nocturne-epure-v1.webp","alt":"Mannequin homme portant le Hoodie Nocturne charbon et le Pantalon Épure anthracite","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]},
 {"id":"horizon-epure-v1","gender":"Homme","items":[{"productId":"edit-05","color":"Ardoise"},{"productId":"edit-14","color":"Anthracite"}],"image":"/images/fitting/prepared/horizon-epure-v1.webp","alt":"Mannequin homme portant le Sweat Horizon ardoise et le Pantalon Épure anthracite","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]},
 {"id":"aube-dune-v1","gender":"Femme","items":[{"productId":"edit-08","color":"Ivoire"},{"productId":"edit-13","color":"Sable"}],"image":"/images/fitting/prepared/aube-dune-v1.webp","alt":"Mannequin femme portant la Chemise Aube ivoire et le Pantalon Dune sable","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]},
 {"id":"aube-atelier-rivage-v1","gender":"Femme","items":[{"productId":"edit-08","color":"Ivoire"},{"productId":"edit-10","color":"Sable"},{"productId":"edit-15","color":"Olive"}],"image":"/images/fitting/prepared/aube-atelier-rivage-v1.webp","alt":"Mannequin femme portant la Chemise Aube ivoire, la Veste Atelier sable et le Pantalon Rivage olive","differences":["Aperçu généré. Les plis et finitions des vêtements sont reconstitués."]}
];
export function findPreparedLook(gender:FittingGender,items:FittingSelection[]):PreparedLook|undefined {
 if(!items.length)return;
 const keys=items.map(x=>`${x.productId}:${x.color}`).sort();
 if(new Set(items.map(x=>x.productId)).size!==items.length)return;
 return preparedLooks.find(look=>look.gender===gender&&look.items.length===keys.length&&look.items.map(x=>`${x.productId}:${x.color}`).sort().every((key,index)=>key===keys[index]));
}

// For a standalone mixed product, use the mannequin of its original studio photo.
// This preference does not change the product's catalog classification.
export function defaultFittingGender(productId:string):FittingGender {
 return generatedLooks.find(look=>look.items.length===1&&look.items[0].productId===productId)?.gender as FittingGender ?? 'Femme';
}
