import type { Product } from '@/types/product';
import { hoodies } from './hoodies';
import { catalogColors, catalogDescription, catalogComposition } from './catalog-media';
const rows: [string, string, number, 'Femme' | 'Homme' | 'Mixte'][] = [
  ['T-shirt Alpine','T-shirts',490,'Mixte'],['T-shirt Wild Cards','T-shirts',490,'Mixte'],['Le coton essentiel','T-shirts',350,'Mixte'],
  ['Hoodie Sable','Hoodies',790,'Mixte'],['Sweat Horizon','Hoodies',850,'Homme'],['Hoodie Studio','Hoodies',790,'Femme'],
  ['Chemise Medina','Chemises',690,'Mixte'],['Chemise Aube','Chemises',750,'Femme'],['Chemise Riviera','Chemises',720,'Homme'],
  ['Veste Atelier','Vestes',1490,'Femme'],['Blazer Casablanca','Vestes',1790,'Homme'],['Veste Nomade','Vestes',1290,'Mixte'],
  ['Pantalon Dune','Pantalons',890,'Femme'],['Pantalon Épure','Pantalons',950,'Homme'],['Pantalon Rivage','Pantalons',790,'Mixte'],
  ['Robe Lumière','Robes',1290,'Femme'],['Robe Sillage','Robes',1490,'Femme'],['Robe Patio','Robes',1190,'Femme'],
  ['Ensemble Méridien','Ensembles',1890,'Femme'],['Ensemble Latitude','Ensembles',1990,'Homme'],['Ensemble Heure douce','Ensembles',1690,'Mixte'],
  ['Cabas Quotidien','Accessoires',590,'Mixte'],['Écharpe Nuage','Accessoires',450,'Mixte'],['Sac Traversée','Accessoires',890,'Mixte'],
];
export const categories = ['T-shirts','Hoodies','Chemises','Vestes','Pantalons','Robes','Ensembles','Accessoires'];
export const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const originalProducts: Product[] = rows.map(([name, category, price, gender], i) => {
  const colors = catalogColors(i);
  const sizes = category === 'Accessoires' ? ['Unique'] : ['XS','S','M','L','XL'];
  return { id: `edit-${String(i+1).padStart(2,'0')}`, slug: slugify(name), name, category, gender, collection: i % 3 ? 'Les essentiels' : 'Édition 01', price,
    description: catalogDescription(i),
    colors, sizes, stock: 12, composition: catalogComposition(i), care: 'Lavage délicat à 30 °C. Sécher à l’air libre. Repasser sur l’envers. Suivre l’étiquette du produit réel.', status: i < 6 ? 'Nouveauté' : 'Essentiel', media: 'concept', variants: colors.flatMap(c=>sizes.map(size=>({color:c.name,size,stock:size==='XL'?0:4}))) };
});
export const products: Product[] = [...originalProducts, ...hoodies];
export const getProduct = (slug: string) => products.find(p => p.slug === slug);
