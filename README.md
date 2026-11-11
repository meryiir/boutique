# MAISON ÉDIT

**Catalogue entièrement photoréaliste :** les 32 produits des huit catégories utilisent maintenant des visuels raster générés. Les 24 pièces initiales ont des vues face/dos ; la capsule de huit hoodies conserve ses rotations coordonnées. Voir [docs/CATALOGUE-PHOTOREALISTE.md](docs/CATALOGUE-PHOTOREALISTE.md) pour les assets, prompts et limites. Build et 15 scénarios Playwright validés.


**Dernière mise à jour :** le showroom présente huit hoodies distincts générés avec ImageGen, chacun avec sa fiche et huit vues coordonnées. Le catalogue comprend désormais 32 pièces. Détails, prompts et limites : [docs/HOODIES.md](docs/HOODIES.md).


Boutique de mode frontend, en français, pour une démonstration commerciale locale au Maroc. Next.js App Router, React, TypeScript strict, Tailwind CSS, GSAP/ScrollTrigger, Lucide, React Hook Form et Zod. Aucune commande réelle, aucun backend métier, aucun paiement.

## Démarrer

```powershell
npm install
npm run dev -- --port 3107
```

Ouvrir http://localhost:3107. Pour la version de production :

```powershell
npm run build
npm run start -- --port 3107
```

Le port 3107 évite un autre projet déjà présent sur le port 3000 de cette machine.

## Explorer

- `/` : campagne, showroom, collections, catégories, récit au scroll, lookbook et sélection.
- `/collection` : 24 produits, recherche, catégories, genre, couleur, taille, prix, tri, favoris, ajout rapide, pagination progressive. Les filtres sont dans l’URL.
- `/produit/[slug]` : visuels, vues face/dos distinctes, rotation lorsqu’une séquence existe, couleurs, tailles, stocks fictifs, guide et recommandations.
- `/checkout` : coordonnées fictives, téléphone marocain validé, livraison ou retrait simulés, récapitulatif et confirmation explicite de simulation.
- `/maison` et `/informations` : marque, livraison, retours, contact à configurer, crédits et limitations.

## Showroom

Huit hoodies photoréalistes distincts, chacun avec sa propre fiche et huit poses coordonnées de profil à face. Contrôleur réversible, voisins qui s’écartent, toucher, flèches, clavier, reduced motion et fallback. Voir docs/HOODIES.md.

## Catalogue et médias

Le catalogue présente 32 concepts de mode avec des visuels de style photographie de studio. Toutes les illustrations de vêtements ont été remplacées dans les données actives, y compris les catégories, l’accueil, les recommandations, les aperçus, les fiches et le panier. Les nouvelles vues face/dos sont des images distinctes. La Veste Atelier possède deux couleurs générées. Le filtre couleur reflète les variantes disponibles.

Ces concepts générés ne sont pas des photos de produits fabriqués. Prix, stocks et compositions restent fictifs. Les photos de campagne sont des inspirations éditoriales et ne représentent pas ces références. Aucun paiement ou traitement de commande réel.

## Personnaliser

- `data/brand.ts` : devise, lieu, saison, couleurs, livraison et contacts.
- `data/products.ts` : catalogue et variantes ; `types/product.ts` : contrat des données.
- `app/globals.css` : design system et adaptations mobiles.
- `components/wardrobe/` : showroom et lecteur réutilisables.
- `lib/garment-controller.js` : contrôleur de rotation réversible sous MIT.
- `components/animations/EditorialMotion.tsx` : animations et `gsap.matchMedia()`.
- `scripts/create-assets.mjs` : illustrations originales du catalogue.
- `scripts/mobile-atlases.cjs` : dérivés mobiles des séquences du starter.

## Vérifier

```powershell
npm run typecheck
npm run build
npm run test:e2e
node scripts/audit.mjs
node scripts/performance.mjs
```

Démarrer le serveur de production sur 3107 avant les tests. Playwright utilise le Chromium installé détecté automatiquement sur Windows ; sinon exécuter `npx playwright install chromium`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permet de choisir le navigateur des tests ; `BASE_URL` choisit l’URL. Pour les scripts d’audit de cette machine, `CHROME_PATH` permet de remplacer le chemin Chromium.

Les scénarios, captures et audits sont détaillés dans `docs/VALIDATION.md`. Les rapports bruts sont dans `docs/` et le rapport Playwright dans `playwright-report/`.

## Licences

Séquences Alpine/Wild Cards et contrôleur : copyright 2026 Amir Mušić, MIT, voir `docs/LICENSE-starter.txt`, `docs/LICENCE-ASSETS.md`, `docs/THIRD_PARTY_NOTICES.md` et `public/garments/provenance.json`. Alpine : LTX-2.5 Pro ; Wild Cards : Kling 3.0 via Pika ; artwork fourni par Amir. Les concepts et illustrations ne représentent pas des produits fabriqués.

Photographies éditoriales : Unsplash, fichiers sources identifiés dans la page Informations. Polices Manrope et Cormorant Garamond : SIL Open Font License, textes dans `public/fonts/`. Icônes Lucide : ISC. Les références HOOKLINE, LOOMA et HEXTERN ont été étudiées sans réutiliser leurs médias ou leur identité visuelle.
