# Édition Hoodie — huit créations originales

Les huit T-shirts répétés du showroom ont été remplacés par huit concepts de hoodies distincts, à la demande de l’utilisateur :

| Création | Couleur | Détails |
|---|---|---|
| Nocturne | Charbon | Molleton lavé, coupe ample, panneaux architecturaux |
| Dune | Sable | Coupe courte, épaules tombantes, capuche sans cordons |
| Terrain | Olive | Zip intégral, poche poitrine utilitaire |
| Sillage | Bordeaux | Broderies florales crème sur le buste et la manche |
| Texture | Écru | Maille gaufrée, ligne longue, coutures espresso |
| Électrique | Cobalt | Manches ballon, encolure croisée, volume court |
| Rosée | Rose poudré | Cardigan zippé, manches raglan, taille côtelée |
| Fragment | Indigo | Panneaux délavés, coutures apparentes, coupe streetwear |

## Génération et fichiers

Outil utilisé : **ImageGen intégré**, et non le CLI ou un service de génération vidéo. Une génération indépendante par design. Les huit jeux de prompts exacts sont conservés dans [hoodie-generation-prompts.json](hoodie-generation-prompts.json).

Originaux : `public/garments/generated-sources/{noir,sable,olive,bordeaux,ecru,cobalt,rose,indigo}.png`.

Assets intégrés : `public/garments/hoodie-{id}/` contient `front.webp`, `profile.webp`, `atlas.webp`, `atlas-mobile.webp` et `manifest.json`. Les dossiers correspondent aux huit identifiants ci-dessus.

Planche de contrôle : `docs/hoodie-review.png`. Captures du showroom : `docs/screenshots/showroom-eight-desktop.png` et `showroom-eight-mobile.png`.

Le pipeline `scripts/prepare-hoodies.cjs` extrait les huit poses de chaque planche, conserve les proportions, aligne le sommet du cintre et produit les WebP desktop/mobile. Aucune photo n’est écrasée avec rotateY. Le lecteur utilise maintenant le nombre d’images et les colonnes déclarés dans le manifest, et reste compatible avec les anciennes séquences de 30 images du catalogue.

## Comportement et limites

Chaque création a sa propre fiche, son prix, sa couleur, ses tailles et ses variantes. La fiche du modèle sable utilise l’URL `/produit/hoodie-dune` pour éviter le conflit avec l’ancien Hoodie Sable. Le catalogue contient désormais 32 produits : les 24 pièces précédentes et les huit hoodies. Les T-shirts restent au catalogue mais ne figurent plus sur le portant.

Les nouvelles animations parcourent **huit vues générées coordonnées de profil à face**, puis reviennent en sens inverse. Ce sont des concepts photoréalistes générés, pas des photos de vêtements fabriqués, des vidéos de tissu ou des modèles 3D. La précision et la fluidité restent limitées par ces huit vues. Les dos n’ont pas été générés : aucun bouton de vue arrière ne les invente.

Le contrôleur conserve les inversions, le déplacement des voisins, le clavier, les commandes tactiles et reduced motion. Les originaux et les prompts sont conservés dans le projet. Les scores Lighthouse précédents ne sont pas présentés comme une mesure de cette nouvelle capsule.

## Vérification

Build de production et contrôle TypeScript réussis. Tests dédiés : les huit pièces atteignent leur dernière vue et reviennent au profil ; compteur, boucle clavier, huit atlas distincts, accès au huitième au toucher, absence de débordement à 390 et 714 px. Les tests de fiches vérifient les huit visuels distincts, l’absence de dos non disponible et la variante ajoutée au panier.

Un premier enregistrement des captures a échoué par manque d’espace disque. Seul le cache régénérable `.next/cache` de ce projet a été supprimé, puis les deux tests de showroom et leurs captures ont été exécutés avec succès sans traces volumineuses.

Validation finale : les 12 scénarios Playwright passent (rotations, huit fiches, panier, catalogue, checkout, neuf largeurs, reduced motion, fallback, captures, animations et navigation des 32 fiches). Build de production réussi. Aucun score Lighthouse antérieur n’est réattribué à cette version.
