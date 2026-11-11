import type { Product } from '@/types/product';
const designs = [
 ['noir','Hoodie Nocturne','Charbon','#303033',990,'Une coupe oversized, du molleton lavé et des découpes architecturales ton sur ton.'],
 ['sable','Hoodie Dune','Sable','#c2ac8c',890,'Un volume court et généreux, des épaules tombantes et un col sculptural sans cordons.'],
 ['olive','Hoodie Terrain','Olive','#565d42',1190,'Un zip intégral, des poches utilitaires et une structure affirmée en coton épais.'],
 ['bordeaux','Hoodie Sillage','Bordeaux','#692f3a',1090,'Un molleton bordeaux profond, ponctué de broderies florales crème et de cordons épais.'],
 ['ecru','Hoodie Texture','Écru','#e2dac7',950,'Une maille gaufrée, une ligne allongée et des surpiqûres contrastées couleur espresso.'],
 ['cobalt','Hoodie Électrique','Cobalt','#264eac',990,'Un bleu franc, des manches ballon et une encolure à capuche croisée.'],
 ['rose','Hoodie Rosée','Rose poudré','#b48188',1090,'Un cardigan zippé à capuche, des manches raglan et une taille marquée par un bord-côte profond.'],
 ['indigo','Hoodie Fragment','Indigo','#293b57',1290,'Un jeu de panneaux délavés et de coutures apparentes pour une silhouette streetwear ample.'],
] as const;
export const hoodies: Product[] = designs.map(([id,name,color,hex,price,description]) => ({
 id:`hoodie-${id}`,slug:id==='sable'?'hoodie-dune':`hoodie-${id}`,name,category:'Hoodies',gender:'Mixte',collection:'Édition Hoodie',price,
 description:`${description} Visuel de mode photoréaliste généré pour MAISON ÉDIT. Concept de démonstration, sans produit fabriqué ni vente réelle.`,
 colors:[{name:color,hex,image:`/garments/hoodie-${id}/front.webp`,garment:`hoodie-${id}`}],
 sizes:['XS','S','M','L','XL'],stock:16,composition:'100 % coton — composition indicative de ce concept de démonstration.',
 care:'Lavage délicat à 30 °C, sur l’envers. Séchage à l’air libre. Entretien à confirmer sur le produit réel.',status:'Nouvelle capsule',media:'concept',
 variants:['XS','S','M','L','XL'].map(size=>({color,size,stock:size==='XL'?0:4})),
}));
