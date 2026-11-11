import type { Color } from '@/types/product';

const colorways = [
 ['Blanc','#eeeae4'],['Rose','#cfa6ad'],['Écru','#ddd4bf'],
 ['Terre','#af735b'],['Ardoise','#657984'],['Perle','#c9c7c2'],
 ['Sable','#b8a58e'],['Ivoire','#e7e0cf'],['Rayé olive','#77806b'],
 ['Sable','#b8a58e'],['Noir','#292a2c'],['Olive','#727a55'],
 ['Sable','#b8a58e'],['Anthracite','#4c4d4b'],['Olive','#727a55'],
 ['Ivoire','#e7e0cf'],['Espresso','#574337'],['Terracotta','#ac6b50'],
 ['Sable','#b8a58e'],['Olive','#727a55'],['Pierre','#c9c4b9'],
 ['Naturel','#c5b69b'],['Avoine','#d7ccba'],['Cognac','#9e643f'],
] as const;

export function catalogColors(index: number): Color[] {
 const [name,hex]=colorways[index];
 const root=`/images/catalog/product-${String(index).padStart(2,'0')}`;
 const colors: Color[]=[{name,hex,image:`${root}-front.webp`,back:`${root}-back.webp`}];
 if(index===9)colors.push({name:'Olive',hex:'#727a55',image:`${root}-olive-front.webp`,back:`${root}-olive-back.webp`});
 return colors;
}

const details = [
 ['Un paysage abstrait, une toile blanche et une coupe généreuse. Une pièce graphique au coton épais, pensée pour les superpositions.', '100 % coton épais'],
 ['Une nuance rose sourde, un tracé graphique minimal et un volume boxy. Le détail discret qui donne du caractère au quotidien.', '100 % coton épais'],
 ['Un jersey écru au toucher lisse, une encolure nette et une ligne sans détour. L’essentiel qui accompagne toutes les silhouettes.', '100 % coton mercerisé'],
 ['Un molleton terracotta, une capuche généreuse et des découpes arrondies. La douceur avec une présence bien à elle.', '100 % coton molletonné'],
 ['Un col rond côtelé et des épaules tombantes dans un bleu ardoise. Un sweat ample qui trouve sa place entre confort et allure.', '100 % coton French terry'],
 ['Une longueur courte, des manches ballon et une capuche sculpturale. Un hoodie gris perle au volume résolument contemporain.', '100 % coton épais'],
 ['Le grain du lin, des boutons nacrés et une coupe qui respire. Une chemise sable à porter ouverte ou boutonnée, à votre rythme.', '100 % lin'],
 ['De la popeline ivoire, une patte discrète et des manches délicatement volumineuses. Une blouse lumineuse au tombé architectural.', '100 % coton popeline'],
 ['Des rayures olive sur fond crème, un col ouvert et une coupe détendue. Une chemise qui prolonge l’esprit de la Riviera.', '100 % coton texturé'],
 ['Un blazer à l’épaule naturelle, deux boutons et une ligne ample. Le grain du lin apporte de la douceur à une coupe affirmée.', '55 % lin, 45 % coton'],
 ['Un noir profond, des revers précis et une épaule dessinée sans rigidité. Le blazer qui structure la silhouette avec retenue.', '100 % laine, doublure viscose'],
 ['Une toile olive lavée, trois grandes poches et des coutures franches. Une veste de travail réinterprétée pour les journées libres.', '100 % coton canvas'],
 ['Une taille haute et des plis qui s’ouvrent sur une jambe large. Le pantalon sable laisse le mouvement dessiner sa silhouette.', '55 % lin, 45 % coton'],
 ['Un pli net, une jambe droite et le grain d’une étoffe anthracite. Un pantalon de ville à l’équilibre juste.', '100 % laine de costume'],
 ['Un twill olive, une ligne légèrement arrondie et une taille souple au dos. Une pièce utilitaire qui reste légère dans l’allure.', '100 % coton twill'],
 ['Un décolleté carré, de larges bretelles et une jupe qui s’évase doucement. Une robe midi ivoire inspirée par la lumière.', '100 % lin'],
 ['Un satin espresso coupé dans le biais, un col drapé et de fines bretelles. Une robe fluide pour les heures qui s’attardent.', 'Satin de viscose'],
 ['Une popeline terracotta, une ceinture assortie et une jupe généreuse. La robe chemise prend une allure solaire.', '100 % coton popeline'],
 ['Un gilet sans manches et un pantalon ample dans le même lin sable. Deux pièces coordonnées, à vivre ensemble ou séparément.', '100 % lin'],
 ['Une chemise à col ouvert et un pantalon droit, réunis par une nuance olive profonde. Un ensemble décontracté, construit avec soin.', '55 % lin, 45 % coton'],
 ['Un haut à col zippé et un pantalon souple dans une maille couleur pierre. Une tenue qui laisse toute la place aux heures libres.', '100 % coton texturé'],
 ['Une toile naturelle épaisse, des anses en cuir et une base structurée. Le cabas pensé pour garder près de soi les essentiels du jour.', 'Toile de coton, détails en cuir'],
 ['Une maille avoine douce, de fines franges et une longueur enveloppante. Une écharpe qui ajoute de la texture aux lignes simples.', '90 % laine, 10 % cachemire'],
 ['Un cuir grainé cognac, une ligne arrondie et une fermeture en métal brossé. Un petit sac qui accompagne la ville sans l’encombrer.', 'Cuir grainé, doublure coton'],
] as const;

export function catalogDescription(index: number) {
 return `${details[index][0]} Visuel photoréaliste généré pour cette collection de démonstration.`;
}

export function catalogComposition(index: number) {
 return `${details[index][1]} — composition indicative de ce concept fictif.`;
}
