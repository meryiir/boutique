# Couleurs et inspection des vêtements

## Variantes de couleur

Chaque référence propose au moins trois couleurs. Les couleurs supplémentaires sont créées avec ImageGen intégré à partir du visuel de la pièce : coupe, motifs, poches et construction servent de référence. Il s’agit de concepts de mode générés, pas de photos de vêtements fabriqués.

Les variantes utilisent des fichiers WebP distincts, et non un filtre CSS. Les images de face et de dos sont liées à la couleur sélectionnée. Les variantes de taille et de stock sont créées pour chaque couleur. Le panier conserve le nom exact de la couleur et utilise son visuel.

Les huit hoodies du showroom conservent les séquences existantes de leur teinte d’origine. Les couleurs supplémentaires disposent de vues fixes de face et de dos ; aucune animation de la mauvaise couleur n’est réutilisée.

Fichiers :

- `data/additional-colors.ts` : palette et chemins des deux nouvelles couleurs par pièce.
- `public/images/colorways/item-XX-{a,b}-{front,back}.webp` : vues intégrées.
- `docs/colorway-generation-prompts.json` : prompts exacts utilisés avec l’outil intégré.
- `docs/colorway-source-files.json` : provenance des planches générées.
- `scripts/prepare-colorways.cjs` : découpage proportionnel et encodage WebP.
- `docs/colorway-review.webp` : planche de contrôle.

## Zoom

Sur ordinateur, le survol du visuel produit agrandit l’image et déplace le point d’inspection avec la souris. Le départ du pointeur restaure le cadrage. Un clic ouvre le visualiseur agrandi. L’aperçu rapide du catalogue utilise le même comportement.

Sur mobile, le toucher ouvre le visualiseur. Le déplacement du visuel au doigt est réservé à cette fenêtre, de façon à conserver le défilement vertical habituel de la fiche.

Le visualiseur propose un grossissement de 100 à 400 %, des boutons + et −, un curseur, une remise à zéro et le déplacement de l’image. Les commandes sont nommées et accessibles au clavier : flèches pour déplacer, + et − pour grossir, Échap pour fermer. Le changement de couleur ou de face réinitialise le visualiseur. Le zoom agrandit les pixels disponibles ; il ne crée pas de détails de textile absents du visuel.

Composant partagé : `components/product/ProductImageZoom.tsx`.

## Validation

- 32 produits, 97 couleurs au total : trois par produit, quatre pour la Veste Atelier.
- 64 nouvelles couleurs avec 128 nouvelles vues WebP, pour environ 10,34 Mio au total. Seules les images de la couleur affichée sont chargées dans les cartes et la galerie.
- Build de production et contrôle TypeScript réussis.
- 20 scénarios Playwright validés : 19 au passage complet, puis le scénario catalogue relancé après correction du sélecteur qui incluait un formulaire masqué par Next.js. Le code de la boutique n’a pas été modifié pour contourner ce test.
- Les cinq nouveaux tests contrôlent les fichiers et les variantes des 32 produits, les images distinctes par couleur, la couleur dans le panier, le zoom au survol et au clavier, le zoom tactile et l’aperçu rapide.
- Aucun débordement aux neuf largeurs testées ; navigation, favoris, panier, checkout simulé, showroom, reduced motion et fallback toujours validés.
- Audit axe WCAG A/AA du visualiseur agrandi : aucune violation détectée, résultat dans docs/zoom-accessibility.json.
- Captures : docs/screenshots/colors-product-desktop.png, colors-zoom-mobile.png, zoom-hover-desktop.png et zoom-viewer-desktop.png.

Les couleurs ont été créées avec ImageGen intégré. Les PNG de génération sont conservés à leur emplacement d’origine ; les fichiers WebP finaux et les prompts sont enregistrés dans le projet. Aucun nouveau score Lighthouse n’a été mesuré pour cette modification.

## Ajustement du zoom automatique
Le passage de la souris active un grossissement de 250 % sur la fiche et dans la vue agrandie. Le point examiné suit la souris sans clic ni glissement. Le départ de la souris rétablit la vue. Les vues de détails chargent le fichier source directement, sans redimensionnement ni compression Next supplémentaires ; leur finesse reste celle du visuel source. Les commandes tactiles et clavier sont conservées.

