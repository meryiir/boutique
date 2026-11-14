# Studio 3D frontend

## Fonctionnement

Le catalogue et les 32 fiches produit proposent le studio à gauche sur ordinateur et dans un panneau ouvrable sur mobile. Il utilise Three.js et WebGL, chargés à la demande. Aucun serveur d’essayage, service payant, téléchargement de photo client ni appel à une API externe n’a été ajouté.

La sélection est séparée entre haut, pantalon, veste, robe/ensemble, sac et écharpe. Un nouveau haut remplace le haut, jamais le pantalon ; un nouveau pantalon conserve le haut. Les vestes peuvent être ajoutées par-dessus. Une robe ou un ensemble complet remplace logiquement haut, bas et veste ; un haut ou pantalon enlève la tenue complète incompatible. Les tenues Femme et Homme sont indépendantes, conservées dans le contexte React global et dans sessionStorage, y compris entre catalogue et fiches et après rechargement de l’onglet. Les produits mixtes utilisent le mannequin choisi ; les pièces genrées sélectionnent le mannequin correspondant sans effacer l’autre tenue.

Toutes les 97 couleurs du catalogue sont sélectionnables et modifient les matériaux 3D. Dans une fiche, les pastilles du studio ajoutent/modifient la pièce et sa couleur. Les pastilles de la fiche actualisent aussi la couleur de l’article si celui-ci est déjà dans la tenue. La photo catalogue reste inchangée en dehors de sa variante habituelle.

## Rotation et interaction

La scène est composée de volumes et de maillages, pas d’images planes retournées. OrbitControls permet une rotation continue à la souris ou à un doigt, un zoom par molette/pincement, et des positions Face, Dos, Profil gauche et Profil droit. Le clavier propose les flèches, +, − et Home. La profondeur WebGL masque les surfaces derrière les autres objets. L’animation de la photo vers le mannequin est conservée ; la nouvelle pièce 3D est affichée à son arrivée, tandis que les autres catégories restent présentes.

Les rendus photographiques préparés de la version précédente restent proposés via « Visuel préparé de face », uniquement lorsque la liste exacte des articles, couleurs et mannequin correspond à un rendu existant. Ce mode n’active pas les vues non préparées. Une nouvelle couleur ou sélection réactive la 3D.

Si WebGL ne fonctionne pas, un message explicite et Réessayer sont affichés. La tenue reste sélectionnée ; aucune photo de face n’est déguisée en rendu 3D. Le renderer, les contrôles, les géométries et les textures sont libérés à la fermeture du composant. Le rendu est déclenché aux interactions/changements, sans boucle de rendu permanente.

## Modèles et limites visuelles

Les modèles ont été produits dans le dépôt, par géométrie procédurale : mannequin anatomique simplifié, surfaces de vêtements, manches, cols, jambes, capuches, poches, boutons, sacs et écharpes. Les familles de coupes et certains détails varient selon l’article. Les textures de tissu, rayures et motifs sont des approximations dessinées par code pour la 3D.

Ces modèles NE SONT PAS des copies exactes tirées de patrons, de scans ou de modèles 3D fournis par un fabricant. Les coupes, épaisseurs, motifs et détails sont simplifiés ; les parties non photographiées sont interprétées. Il n’y a pas de simulation physique du tissu, d’ajustement à des mensurations client, de calcul de taille, ni de garantie d’absence d’intersection pour toute association de volumes. Le rendu 3D est schématique, pas photoréaliste. Cette limite figure dans le studio, à côté du visuel. Les photos restent la référence produit.

Pour atteindre une fidélité de production, il faudra remplacer les géométries procédurales par des vêtements 3D conçus à partir des patrons, adaptés à un avatar commun et contrôlés pour les superpositions. L’architecture de sélection, caméra et matériaux peut être conservée. Aucun prestataire ou abonnement n’a été engagé.

## Sources et artefacts

- Sélection et persistance : components/fitting/FittingSelectionProvider.tsx.
- Interface et animation : components/fitting/FittingRoom.tsx.
- Géométries des mannequins et des articles : components/fitting/three/models.ts.
- Scène, contrôles et cycle de vie WebGL : components/fitting/three/Mannequin3D.tsx.
- 64 fichiers GLB : public/models/garments/*.glb, un export par article et mannequin. Ce sont des maillages réels avec matériaux de couleur principale. Les motifs procéduraux du visualiseur navigateur ne sont pas intégrés dans ces exports de géométrie.
- Manifest : docs/3d-model-manifest.json (identifiant, mannequin, chemin, taille, type de représentation).
- Régénération : node scripts/export-fitting-models.cjs. Les exports proviennent des mêmes constructeurs de géométrie que la scène interactive. Le navigateur crée les géométries directement pour adapter tous les matériaux et les deux silhouettes sans charger une image d’essayage.

Documentation officielle consultée : https://threejs.org/docs/pages/OrbitControls.html et https://threejs.org/docs/pages/BufferGeometry.html. Les galeries photo et leurs anciennes animations de profil à face restent indépendantes du studio 3D.

## Vérification

Build de production et TypeScript passent. Sept tests spécifiques : validité des 64 GLB, règles de remplacement, deux tenues indépendantes/persistance entre pages, parcours des 32 articles et de leurs 97 couleurs, changements réellement visibles des couleurs et rotation avant/arrière/profils/clavier, rotation tactile sur mobile, indisponibilité WebGL. Le parcours de couleurs n’a émis aucun appel à une API externe. Les vues ont été inspectées sur ordinateur et mobile ; aucun débordement sur six largeurs de 320 à 1920 px. Captures : docs/screenshots/three-*.png.

Vérification finale : les 7 tests supplémentaires de fiche produit, zoom automatique, zoom mobile, aperçu rapide, catalogue et panier/checkout passent également, soit 14 scénarios validés pour cette livraison. Après correction du contraste du texte de sélection vide, l’audit axe du studio ne détecte aucune violation. Les 64 exports GLB représentent 12 506 164 octets ; ils sont des artefacts disponibles localement, la scène interactive générant ses volumes à la demande.


## Interface compacte et retour aux mannequins d’origine
La vue par défaut utilise de nouveau les mannequins photoréalistes d’origine (Femme et Homme). Lorsqu’un rendu porté exact existe pour l’article principal et le mannequin, il est affiché après Essayer. Pour une couleur ou tenue sans rendu photographique préparé, la sélection est conservée et un message indique que son affichage est disponible en 3D simplifiée. Aucun calque photo approximatif n’est utilisé.
Une unique icône de rotation ouvre explicitement la représentation 3D simplifiée et permet de revenir à la vue d’origine. Les boutons Face/Dos/Profils et les boutons de mode ont été retirés. Les photographies d’origine ne sont pas présentées comme des volumes tournants.
Le bouton Essayer sur le mannequin est placé sous les couleurs de la fiche produit, avant les tailles, et reste visible dans une fenêtre 1366 × 768. Le studio possède un cadre de hauteur adaptée au viewport sans défilement interne ; sur mobile il se déploie dans le flux de la page et le bouton Essayer y ramène la vue. La page conserve son défilement habituel pour les écrans courts et les sélections longues.
Validation de cet ajustement : compilation et TypeScript passent ; 4 tests studio (originaux, bouton visible, icône/retour, tactile et WebGL indisponible) et 3 tests de régression produit/catalogue/panier passent. Aucun débordement à 320, 390, 768, 1024, 1366 et 1920 px ; overflow du panneau visible à chaque largeur. Audit axe du studio compact : zéro violation détectée. Captures : docs/screenshots/studio-original-compact-desktop.png et studio-original-compact-mobile.png.

