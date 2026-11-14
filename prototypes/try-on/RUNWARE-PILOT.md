# Pilote P-Image-Try-On via Runware

Le pilote multi-références est implémenté dans le dossier existant. Son serveur et sa page se lancent avec `runware-pilot.mjs`. Les adaptateurs FASHN restent disponibles pour conserver les essais précédents. La boutique publique n’est pas encore raccordée à Runware, car la validation visuelle et l’autorisation de dépense restent à obtenir.

## Configuration et autorisation

Le fichier privé a été créé à cet emplacement.

`C:\Users\pc\Documents\boutique\prototypes\try-on\.env.runware.local`

Renseigner `RUNWARE_API_KEY` dans ce fichier avec un éditeur. Conserver `RUNWARE_PAID_AUTHORIZED=0` jusqu’à l’accord explicite sur le budget Runware. Le pilote utilise une clé différente de FASHN. Le fichier est ignoré par Git, hors du répertoire public et inaccessible par les routes HTTP du prototype. La commande de contrôle ne montre que la présence de la clé.

```powershell
node prototypes/try-on/runware-pilot.mjs check
node prototypes/try-on/runware-pilot.mjs serve
```

Ouvrir `http://127.0.0.1:3201`. La sélection et l’import fonctionnent avec le calcul verrouillé. L’accord proposé concerne 0,50 USD au maximum de réservations et 12 créations de tâches au maximum. Après cet accord, passer l’autorisation à `1`, redémarrer le serveur et lancer le plan dans un second terminal.

```powershell
node prototypes/try-on/runware-pilot.mjs run
```

Sans clé et autorisation, cette dernière commande refuse de lancer les essais. Aucune création de tâche payante, aucun achat et aucun abonnement n’ont été effectués pendant la préparation.

## Schéma utilisé

Le modèle est `prunaai:p-image@try-on`, envoyé à `https://api.runware.ai/v1`. La requête comporte `taskType: imageInference`, un `taskUUID` serveur, `inputs.referenceImages` avec un seul rôle `person` et un rôle `garment` par vêtement. Le pilote fixe `numberResults: 1`, `settings.turbo: false`, `settings.preserveInputSize: true`, un seed et une consigne de préservation du mannequin plastique. Il demande une sortie PNG et le coût retourné par le fournisseur. Les résultats asynchrones sont lus par `getResponse` avec le même identifiant. Les champs de l’API directe Pruna ne sont pas envoyés à Runware. [Schéma Runware](https://runware.ai/docs/models/prunaai-p-image-try-on), [polling](https://runware.ai/docs/models-api/task-polling)

Chaque calcul repart du mannequin d’origine et des photos originales de toutes les variantes de la sélection. Une sortie précédente n’est jamais employée comme référence de personne. Le corps généré ne dépend d’aucune entrée `prepared-looks`.

Le modèle classe les vêtements lui-même. Le catalogue conserve des emplacements applicatifs distincts, dont haut, couche intermédiaire, extérieur, pantalon, robe et accessoires. Une pièce remplace celle du même emplacement. Une robe enlève les hauts, couches intermédiaires et bas incompatibles, tout en conservant l’extérieur et les accessoires. Un bas ou un haut enlève la robe. La superposition finale des catégories reste à inspecter. Les blazers et hoodies du plan sont classés comme couches intermédiaires, les vestes de travail comme extérieurs. Le pilote limite le calcul à trois pièces, conformément à la première phase d’évaluation, tout en laissant la sélection modifiable. [Catégories Pruna](https://docs.pruna.ai/en/stable/docs_pruna_endpoints/performance_models/p-image-try-on.html), [guide multi-références Runware](https://runware.ai/docs/models/prunaai-p-image-try-on/guides/virtual-try-on)

## Import et contrôle des photos

Un article et ses variantes sont des données importées par HTTP. Le contrat contient `product`, `variant`, `name`, `gender`, `category`, `color`, `photo` et les déclarations de qualité. Le couple produit/variante forme un identifiant stable au sein du magasin. Réimporter ce couple met à jour sa photo sans programmation spécifique.

Le serveur accepte seulement les fichiers PNG, JPEG et WebP décodables, fixes, de moins de 6 Mo et 20 millions de pixels, avec au moins 256 pixels par côté. Une définition limitée déclenche un avertissement. La présence d’un cintre, le fond et le cadrage sont déclarés et signalés. Une déclaration absente déclenche un avertissement de vérification. Le prototype n’emploie pas un détecteur sémantique capable de certifier l’absence de cintre. Une photo produit propre, complète et sur fond uni reste préférable.

Les octets originaux sont conservés avec leur empreinte SHA-256. Le serveur n’accepte aucune URL arbitraire de photo, aucun choix de modèle et aucune image de mannequin fournie dans une demande de calcul. Il construit les références depuis le catalogue de son magasin et les deux mannequins autorisés.

## Sélection, résultat affiché et sessions

La page garde la tenue demandée et celle du dernier rendu affiché. Modifier les vêtements ne crée pas de tâche. Le bouton « Visualiser ma tenue » déclenche explicitement le calcul. Un texte indique qu’une sélection modifiée attend un rendu. Les erreurs conservent l’image précédente en la distinguant de la nouvelle demande.

Le serveur associe chaque cabine à une session et à un numéro de révision. Le client joint un identifiant de demande. Une modification de sélection ou une mise à jour de photo invalide la révision précédente. Le client et le serveur empêchent un ancien calcul de remplacer l’état courant. Un changement de genre vide la tenue et affiche le mannequin correspondant. La sortie de page clôt la session avec `pagehide` et `sendBeacon`. Le retour à la page ouvre une nouvelle session vide, y compris après une restauration du navigateur.

L’annulation est logique. Une tâche déjà envoyée au fournisseur peut continuer et être facturée après la sortie de page. Son résultat peut être conservé dans le cache, mais il n’est pas appliqué à la session terminée.

## Cache, déduplication et budget

Le fichier persistant `prototypes/try-on/.data/runware/pilot.sqlite` contient le catalogue, les versions immuables des photos, le registre des tâches et les sorties PNG brutes. Le cache comprend le magasin, le mannequin et son empreinte, le modèle, les réglages, le seed, la consigne et les références exactes des variantes. Changer une photo produit change la clé de rendu. Les anciennes versions restent disponibles pour vérifier les entrées des calculs passés.

Une contrainte SQLite et une transaction empêchent la création de deux tâches identiques. Les demandes identiques dans le même processus partagent la promesse en cours. Entre processus, une tâche réservée ou incertaine bloque la création d’un doublon. Une erreur ne déclenche aucune nouvelle génération automatique. Le polling a un délai global borné. Une tâche incertaine reste réservée et doit être examinée avant une nouvelle tentative.

La réserve est de 0,040 USD par nouvelle tâche et le plafond est de 12 tâches et 0,50 USD de réservations cumulées, commun à tous les magasins de ce pilote. Ces limites persistent après redémarrage. Ne pas effacer le fichier de registre pour relancer des essais. Le coût réellement retourné par Runware est enregistré séparément. Un coût supérieur à la réserve interrompt les créations suivantes pour réévaluer le tarif. Les échecs et délais dépassés conservent leur réserve. Les lectures du cache ne créent pas de tâche.

Le schéma documenté ne fournit pas un paramètre Runware de prix maximum par tâche. La limite applicative encadre les créations et leurs réservations, mais ne peut pas garantir un montant de facture si le fournisseur change ses prix au-delà des tarifs vérifiés. Toute anomalie de prix exige l’arrêt et un nouvel accord avant de poursuivre.

Tarifs standard affichés par Runware lors de la préparation du 14 novembre 2026, 0,015 USD pour une pièce, 0,023 USD pour deux et 0,031 USD pour trois. Les neuf cas prévus représentent une estimation de 0,223 USD, hors nouveaux essais et avant coût mesuré. L’autorisation proposée reste plafonnée à 0,50 USD et 12 tâches, avec une réserve conservatrice. Aucun rechargement automatique de compte n’est configuré. [Tarifs du modèle](https://runware.ai/docs/models/prunaai-p-image-try-on), [coût mesuré](https://runware.ai/docs/models-api/pricing)

## Plan d’évaluation réelle en attente

`runware-plan.json` décrit les produits, variantes, photos et neuf cas. Le moteur d’exécution utilise ces données. Ces photos proviennent du catalogue de démonstration, sans échantillon physique d’un magasin.

1. Hoodie Sable + Dune sur le mannequin femme.
2. Remplacer Dune par Rivage.
3. Remplacer le hoodie par Hoodie Studio en conservant Rivage.
4. Retirer uniquement le haut.
5. Chemise Aube + Dune + Veste Atelier.
6. Chemise Aube + Dune + Veste Nomade comme extérieur.
7. Changer Aube Ivoire pour Aube Rose en conservant les autres pièces.
8. Changer de genre, puis Hoodie Sable + Rivage sur le mannequin homme.
9. Importer la photo de Medina sous un nouvel identifiant de magasin, puis la combiner avec Rivage sur le mannequin homme.

Après autorisation et calculs, `evidence/runware-standard/manifest.json` contiendra les statuts, délais, références, coûts retournés et identifiants des tâches. Les originaux du mannequin et des variantes seront exportés et vérifiés par empreinte, avec les sorties PNG brutes. Les résultats resteront marqués en attente d’inspection visuelle, même après une réponse réussie.

L’inspection devra vérifier chaque pièce demandée, les couleurs, motifs, manches, longueurs, proportions, mains, cintres résiduels et l’aspect plastique du mannequin. Comparer les sorties aux originales, ainsi qu’aux étapes précédentes pour les remplacements et retraits. Produire les captures des parcours réels validés à ce moment. Les captures des tests avec transport simulé ne constituent pas des preuves de rendu.

Le mode turbo reste désactivé. Sa qualité et son coût doivent faire l’objet d’une comparaison séparée après validation du standard, avec une clé de cache distincte et un accord de budget adapté.

## Vérifications réalisées sans génération facturée

```powershell
node --test prototypes/try-on/runware.test.mjs
npx playwright test tests/runware-prototype.spec.ts
npm run typecheck
```

Neuf tests du service et deux tests Chromium sur ordinateur et mobile passent avec un transport simulé. Ils contrôlent le schéma, les neuf parcours, les originaux envoyés, le cache, les doublons, les changements de photo, le budget concurrent, les sessions et la présentation de l’état de rendu. Les sorties simulées restent dans les dossiers de test ignorés. Aucune preuve visuelle réelle Pruna n’a été produite pendant cette préparation.

## Décision et raccordement public

Si les sorties réelles sont satisfaisantes, raccorder ce service à la cabine publique avec les mêmes règles de sélection, états de chargement et d’erreur, cache et contrôles de révision. Le déploiement exigera un processus Node persistant, une base et un stockage durables, HTTPS et une attribution authentifiée du magasin. Le prototype est volontairement limité au réseau local jusqu’à cette étape. La boutique conserve son apparence et ses autres fonctions pendant la préparation.

Si Pruna déforme les vêtements ou humanise le mannequin, documenter les images et coûts puis comparer FLUX Virtual Try-On. Son identifiant Runware est `bfl:flux@vto`. Le guide prévoit notamment une composition de photos de vêtements pour certains ensembles, avec une limite annoncée de quatre pièces par composite. Il faut donc évaluer son propre contrat, sans lui appliquer automatiquement celui de Pruna. Aucun essai FLUX ni budget correspondant n’est engagé. [Guide officiel FLUX](https://runware.ai/docs/models/bfl-flux-virtual-try-on/guides/virtual-try-on)

La validation ne couvrira ni une mesure de taille, ni une fidélité parfaite, ni une rotation à 360 degrés.
