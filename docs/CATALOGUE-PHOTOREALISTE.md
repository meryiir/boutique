# Catalogue photoréaliste — remplacement des illustrations

Les visuels des 24 produits initiaux ont été remplacés par de nouvelles créations de style photographie de studio. Les huit hoodies de la capsule précédente sont conservés. Le catalogue comporte donc 32 produits, tous présentés avec des images raster photoréalistes.

Catégories couvertes : T-shirts, hoodies et sweats, chemises, vestes, pantalons, robes, ensembles et accessoires. Les sacs, l’écharpe et les deux-pièces disposent de visuels adaptés à leur nature, plutôt que d’une silhouette générique réutilisée.

## Assets

- `public/images/catalog/product-00-front.webp` à `product-23-front.webp` : vues de face.
- `public/images/catalog/product-00-back.webp` à `product-23-back.webp` : vues de dos.
- `public/images/catalog/product-09-olive-{front,back}.webp` : variante olive de la Veste Atelier.
- `public/garments/hoodie-{id}/` : huit hoodies distincts et leurs vues de showroom, conservés depuis la capsule précédente.
- `docs/catalog-photoreal-review.webp` : planche de contrôle des 24 nouvelles pièces.
- `docs/catalog-generation-prompts.json` : prompts exacts et provenance de génération.

Outil : ImageGen intégré. Les vues de face et de dos de chaque pièce sont générées ensemble puis séparées et optimisées en WebP. La variante olive de la Veste Atelier est une édition référencée du même blazer. La préparation mécanique des fichiers est reproductible avec `scripts/prepare-catalog-photos.cjs` et les chemins de `docs/catalog-source-files.json`.

## Intégration

Les données produit sont la source unique utilisée par le catalogue, les catégories, les sélections de l’accueil, le storytelling, les recommandations, les aperçus rapides, les fiches, le panier et le checkout. Les fichiers SVG et les premières études procédurales ne sont plus les images actives des produits. Les logos et les icônes restent naturellement des éléments vectoriels.

Les couleurs du catalogue correspondent aux couleurs générées. La sélection Olive de la Veste Atelier charge ses propres vues. Les filtres exposent toutes les couleurs présentes dans les données. Des descriptions et des compositions indicatives ont été adaptées aux vêtements, sacs et écharpe.

## Portée des images

Il s’agit de concepts de mode générés d’aspect photographique, pas de photographies de produits fabriqués ou disponibles à la vente. Les compositions et stocks restent fictifs. Une collection commerciale réelle doit utiliser les photos et informations vérifiées de la boutique.

Les 24 nouvelles pièces ont deux vues fixes distinctes. La navigation face/dos et le survol des cartes changent de photo ; ils ne simulent pas une rotation 3D. Les huit hoodies du showroom gardent leurs huit poses coordonnées de profil à face. Aucune rotation des anciennes séquences de T-shirts n’est associée aux nouveaux visuels.

## Validation finale

Build de production et TypeScript réussis. **15 scénarios Playwright réussis** : vérification des assets raster et de leur chargement dans les huit catégories, vues face/dos et variante olive, huit rotations de hoodies, fiches distinctes, favoris, filtres, recherche, panier, checkout simulé, responsive aux neuf largeurs, reduced motion, fallback, absence d’erreurs JavaScript, animations et navigation des 32 fiches. Les deux retouches de détourage ont été réalisées avec ImageGen ; prompts conservés dans `docs/catalog-cleanup-prompts.json`. Aucun score Lighthouse précédent n’est présenté comme une nouvelle mesure de ce catalogue.
