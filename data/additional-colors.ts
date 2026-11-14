import type { Color } from '@/types/product';

export const additionalColorways = [[["Olive","#727a55"],["Marine","#293950"]],[["Ivoire","#e7e0cf"],["Bordeaux","#692f3a"]],[["Noir","#292a2c"],["Cobalt","#264eac"]],[["Sable","#b8a58e"],["Marine","#293950"]],[["Écru","#ddd4bf"],["Bordeaux","#692f3a"]],[["Olive","#727a55"],["Rose","#cfa6ad"]],[["Olive","#727a55"],["Bleu ciel","#9eb9c9"]],[["Rose","#cfa6ad"],["Marine","#293950"]],[["Rayé marine","#293950"],["Rayé terracotta","#ac6b50"]],[["Marine","#293950"],["Bordeaux","#692f3a"]],[["Sable","#b8a58e"],["Olive","#727a55"]],[["Écru","#ddd4bf"],["Marine","#293950"]],[["Noir","#292a2c"],["Olive","#727a55"]],[["Sable","#b8a58e"],["Marine","#293950"]],[["Écru","#ddd4bf"],["Anthracite","#4c4d4b"]],[["Olive","#727a55"],["Terracotta","#ac6b50"]],[["Bordeaux","#692f3a"],["Vert sauge","#a0aa8d"]],[["Ivoire","#e7e0cf"],["Marine","#293950"]],[["Noir","#292a2c"],["Olive","#727a55"]],[["Sable","#b8a58e"],["Marine","#293950"]],[["Bordeaux","#692f3a"],["Marine","#293950"]],[["Olive","#727a55"],["Noir","#292a2c"]],[["Bordeaux","#692f3a"],["Anthracite","#4c4d4b"]],[["Noir","#292a2c"],["Crème","#e7e0cf"]],[["Olive","#727a55"],["Écru","#ddd4bf"]],[["Noir","#292a2c"],["Bordeaux","#692f3a"]],[["Sable","#b8a58e"],["Cobalt","#264eac"]],[["Marine","#293950"],["Ivoire","#e7e0cf"]],[["Terracotta","#ac6b50"],["Anthracite","#4c4d4b"]],[["Écru","#ddd4bf"],["Noir","#292a2c"]],[["Olive","#727a55"],["Marine","#293950"]],[["Sable","#b8a58e"],["Bordeaux","#692f3a"]]] as const;

export function additionalColors(index: number): Color[] {
 return additionalColorways[index].map(([name,hex],offset)=>({
  name,hex,
  image: `/images/colorways/item-${String(index).padStart(2,'0')}-${offset===0?'a':'b'}-front.webp`,
  back: `/images/colorways/item-${String(index).padStart(2,'0')}-${offset===0?'a':'b'}-back.webp`,
 }));
}

