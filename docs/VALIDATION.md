# Validation de MAISON ÉDIT

## Mise à jour : huit T-shirts

Le portant affiche huit pièces : Alpine et Wild Cards, répétés quatre fois chacun. Les huit rotations sont indépendantes et partagent deux atlas. Build de production et deux nouveaux tests réussis : rotation et retour des huit pièces, compteur, boucle clavier, partage des atlas, accès tactile au huitième, absence de débordement à 390 et 714 px. Captures : showroom-eight-desktop.png et showroom-eight-mobile.png. Les mesures Lighthouse ci-dessous concernent la version précédente à deux cintres ; elles n’ont pas été remesurées pour huit.


Validation locale du 11 novembre 2026 sous Windows, Chromium via Playwright, serveur Next.js de production sur http://127.0.0.1:3107. Les mesures ci-dessous sont des résultats observés sur cette machine et restent variables selon appareil et conditions.

## Résultat des parcours

**9 scénarios Playwright réussis en environ une minute**, après les corrections et le retrait des vêtements non photoréalistes du showroom. TypeScript strict et build de production réussis.

1. Survol du vêtement, image 0 → 29, retour 29 → 0, interruption et inversion, écartement du voisin à pleine opacité, pivot horizontal conservé à moins de 2 px, navigation au clavier, clic vers la bonne fiche.
2. Émulation mobile tactile 390 × 844 : sélection au toucher, rotation atteignant la dernière image, flèches alternatives, défilement horizontal natif, scroll vertical préservé et ouverture via le bouton explicite.
3. Fiche : taille obligatoire, vue du dos distincte, rotation préparée profil/face, changement réel des visuels par couleur, variante de taille, taille XL fictivement indisponible, zoom et guide fermables avec Échap.
4. Catalogue : 12 puis 24 produits, catégorie, couleur, taille, prix, tri croissant, URL partageable et conservée au rechargement, favoris persistants, aperçu rapide, recherche, état vide.
5. Panier : couleur/taille exactes, ajout, quantité, calcul 1 490 puis 2 980 MAD, rechargement et persistance, diminution, livraison 45 MAD, retrait à 0 MAD, erreurs de formulaire, coordonnées fictives marocaines, consentement, confirmation de simulation, panier vidé et coordonnées absentes de localStorage, suppression d’une ligne.
6. Responsive : absence de débordement horizontal et d’image cassée sur accueil, catalogue, produit, Maison et informations à **320, 360, 375, 390, 430, 768, 1024, 1440 et 1920 px**, soit 45 combinaisons de pages et largeurs.
7. Captures desktop 1440 et mobile 390 : accueil, showroom, catalogue, fiche, Maison, informations, panier et checkout, dans docs/screenshots/.
8. Reduced motion effectif, endpoints accessibles sans animation, fallback statique quand les atlas sont bloqués, aucune erreur JavaScript non interceptée sur les pages principales.
9. Parallax et crossfade éditoriaux réellement contrôlés au scroll sur mobile et desktop, apparition de la pièce du storytelling, réponses HTTP 200 et contenu correct pour les 24 fiches.

Rapport détaillé : playwright-report/index.html ; source : tests/shop.spec.ts.

## Accessibilité

Axe WCAG 2 A/AA et 2.1 A/AA : **aucune violation détectée** sur les cinq pages principales, en viewport mobile. Rapports dans docs/accessibility-memory.json. Après agrandissement des liens et sélecteurs, Lighthouse atteint 100/100 en accessibilité sur les trois pages mesurées. Les dialogs natifs assurent confinement du focus et fermeture clavier. Un audit automatisé ne remplace pas une revue manuelle complète avec lecteur d’écran.

## Lighthouse mobile

Configuration mobile standard de Lighthouse 13, réseau et CPU simulés, build de production. Rapports HTML et JSON dans docs/lighthouse-{home,collection,product}.*.

| Page | Performance mobile | Accessibilité | Bonnes pratiques | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|
| Accueil | 92 | 100 | 100 | 3.29 s | 0.000 | 84 ms |
| Catalogue | 92 | 100 | 100 | 3.28 s | 0.000 | 122 ms |
| Fiche produit | 95 | 100 | 100 | 2.92 s | 0.000 | 76 ms |

Les cibles Performance ≥ 90, Accessibilité ≥ 95 et CLS ≤ 0,1 sont atteintes sur ces trois pages. **La cible LCP ≤ 2,5 s n’est pas atteinte** : les valeurs mesurées restent entre 2,92 et 3,29 s. L’INP réel n’est pas mesuré : aucun trafic terrain n’est disponible. Le TBT est une mesure laboratoire distincte et ne doit pas être présenté comme de l’INP.

Le score SEO de 63 est documenté dans les rapports : la démonstration est volontairement marquée noindex/nofollow, et aucun référencement public n’est revendiqué. Bonnes pratiques : 100/100.

Optimisations effectuées : polices WOFF2 réduites aux caractères utiles (~87 Ko pour les trois fichiers, contre ~1,39 Mo en TTF), image du hero prioritaire, qualité adaptée, GSAP importé après le premier rendu, catalogue rendu dès la requête au lieu d’attendre le JavaScript client, images lazy, atlas mobiles distincts, aucun moteur WebGL. Le rendu à la requête relève du framework Next.js ; il n’existe aucun backend métier, base de données, API de commande ou service de paiement.

## Mémoire du showroom

Deux atlas de 30 images. Budget d’images décodées calculé à partir des dimensions : **15.38 Mio sur mobile**, **39.38 Mio sur desktop**, hors canvas, autres images et mémoire navigateur. Les deux atlas mobiles transfèrent environ 420 Kio au total. JSHeapUsedSize observé avant/après entrée dans le showroom : 2.93 → 6.81 Mio. La mémoire du tas JS ne mesure pas la totalité des images décodées ni de la mémoire GPU.

Les atlas sont demandés près de la section, partagés entre lecteurs d’un même type, et les boucles sont annulées hors écran ou au démontage. Aucun ensemble de 24 animations n’est chargé avec la grille.

## Limites assumées et médias manquants

- Le showroom contient **huit T-shirts**, Alpine et Wild Cards répétés quatre fois chacun. Les dessins ont été retirés après le retour utilisateur sur le réalisme. Il manque six séquences autorisées pour proposer huit modèles distincts. Les répétitions sont indiquées dans la section.
- Les deux concepts disponibles sont des médias générés d’Amir Mušić sous MIT, pas des photos de vêtements fabriqués. Leurs détails peuvent comporter les limites des médias générés d’origine.
- Les autres produits restent des illustrations de démonstration clairement identifiées. Les photographies de campagne ne sont pas des photos portées de ces références. De vraies photos portées, détails de matières et séquences de rotation doivent être fournies pour un catalogue commercial photoréaliste.
- Le dos est une image distincte ; seule la rotation profil/face possède une séquence cohérente. Aucun 360° complet n’est revendiqué.
- Mobile testé en émulation Chromium, pas sur téléphone physique. Safari iOS, Firefox et différents appareils réels restent à vérifier.
- Checkout entièrement simulé. Aucun paiement, envoi de commande, collecte bancaire, WhatsApp ou Instagram réel.
- Aucune génération payante d’images ou vidéos, dépense de génération : 0.
