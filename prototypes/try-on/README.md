# Prototype d’essayage automatisé · Maison Édit

L’alternative multi-références P-Image-Try-On via Runware dispose de son adaptateur, de sa page et de son plan de neuf essais dans ce dossier. Consulter [le pilote Runware](RUNWARE-PILOT.md) pour la configuration privée, le plafond proposé et les vérifications réalisées. Les calculs réels attendent la clé et une autorisation de dépense distincte.

Ce serveur local et sa page sont séparés de la boutique. Ils utilisent le mannequin femme d’origine avec un fond uni et des photos de catalogue ou des variantes importées. L’image portée vient du moteur distant ou du cache des véritables calculs. Aucune requête payante n’a été envoyée.

## Essayer sur ce PC

Depuis la racine du dépôt, avec Node.js 24 et les dépendances du projet installées (la version de Next du projet fournit sharp en dépendance optionnelle) :

```powershell
$env:VTON_PROVIDER = 'off'
$env:VTON_REPLAY_EVIDENCE = '1'
$env:VTON_PORT = '3192'
$env:VTON_DATA_DIR = Join-Path $env:TEMP 'maison-vton-evidence'
node prototypes/try-on/server.mjs
```

Ouvrir http://127.0.0.1:3192. Choisir Alpine Blanc, Rivage Olive ou Robe Lumière Ivoire seul, puis « Calculer l’aperçu ». Les résultats relus sont identifiés comme provenant du cache. Le serveur ne les charge que si les empreintes des entrées correspondent ; les PNG sont les sorties du moteur spécialisé documentées dans evidence/runs.json.

Pour une nouvelle génération gratuite, enlever VTON_REPLAY_EVIDENCE, prendre un dossier de données séparé et choisir VTON_PROVIDER=free. Ce mode transmet les images au démonstrateur FASHN public sur Hugging Face, sans jeton et sans achat. Il sert aux photos publiques de ce test. Le GPU partagé peut refuser des demandes et ne constitue pas un hébergement de boutique. Par défaut VTON_PROVIDER=off.

Le pilote API v1.6 dispose désormais d’un lanceur dédié, d’un fichier de clé privé, d’un verrou d’autorisation et d’un registre cumulé plafonné à 10 crédits. Une clé seule n’active aucune dépense. Consulter [la configuration du pilote FASHN](FASHN-PILOT.md) pour renseigner la clé et reprendre les cinq essais après autorisation. Les images calculées et leur inspection restent en attente. L’achat des crédits se fait séparément chez FASHN.

## Capacités et coût

| Piste | Intrants et limites | Coût et hébergement |
|---|---|---|
| FASHN v1.5 libre | Un mannequin et un vêtement, catégories haut, bas ou pièce entière. Apache 2.0. Sorties du démonstrateur 576 × 864. | Démo gratuite avec quota. Auto-hébergement Python/PyTorch, poids ~2 Go plus modèles auxiliaires, de préférence GPU CUDA. Ce PC a un GPU Intel Iris Xe, aucun GPU CUDA détecté. Le coût GPU dépend de l’hôte. |
| FASHN API v1.6 | Un vêtement par appel, catégories explicites. En mode équilibré, FASHN annonce environ 8 secondes de calcul, hors attente et transfert. Garantie de conservation du reste de la tenue à établir. | 1 crédit par sortie, 0,075 USD par crédit au tarif à la demande. Minimum prépayé 7,50 USD pour 100 crédits. Serveur Node avec HTTPS sortant et stockage, sans GPU local. |
| FASHN Try-On Max | Une image produit et une image modèle, plus un prompt optionnel. Préversion, support des accessoires. Le schéma ne décrit pas une tenue à pièces indépendantes en une requête. | 1 à 5 crédits selon résolution et mode, soit 0,075 à 0,375 USD par sortie à la demande. Même architecture d’hébergement. |
| Google Cloud Virtual Try-On | La grille indique une image de personne et une image de vêtement, sans garantie de composition. | 0,06 USD par image, projet Google Cloud et authentification serveur. Non utilisé pour les essais. |

Sources officielles consultées le 14 novembre 2026 : [FASHN v1.6](https://docs.fashn.ai/api-reference/tryon-v1-6), [Try-On Max](https://docs.fashn.ai/api-reference/tryon-max), [prix FASHN](https://help.fashn.ai/plans-and-pricing/api-pricing), [dépôt v1.5](https://github.com/fashn-AI/fashn-vton-1.5), [démo FASHN ZeroGPU](https://huggingface.co/spaces/fashn-ai/fashn-vton-1-5), [quota ZeroGPU](https://huggingface.co/docs/hub/main/spaces-zerogpu), [prix Google Cloud](https://cloud.google.com/model-garden/pricing).

## Essais observés

### Reprise du 14 novembre

Le script `node prototypes/try-on/verify-import.mjs` utilise uniquement le fournisseur gratuit et refuse les autres modes. `VTON_TEST_URL` permet de choisir son serveur local (3195 par défaut). Il importe la photo de Chemise Medina dans le catalogue du prototype sous un nouvel identifiant, puis tente le nouvel article, sa composition avec Rivage, un remplacement et un retrait. Aucun ajout à prepared-looks n’est utilisé. Le journal `evidence/import-validation.json` contient les réponses réelles. L’import a répondu HTTP 201. La génération distante a répondu HTTP 502 après 2,09 secondes avec une erreur du démonstrateur sans cause détaillée. La composition, le remplacement et le retrait depuis une composition complète restent non validés visuellement.

La page vérifie côté serveur si un calcul est possible avant de l’activer. Sans moteur, le calcul d’une sélection sans rendu en cache est désactivé avec explication visible. Les contrôles de sélection restent utilisables. Le plafond couvre toutes les étapes manquantes de la sélection avant le premier appel, puis chaque appel est réservé séparément. Les compositions calculées portent une mention de validation visuelle requise.

### Sélection et rendu indépendants

`POST /selection` applique les règles de `components/fitting/wardrobe.ts`, également utilisées par la boutique. Il accepte les identifiants courants, un ajout et un retrait éventuels, puis retourne la sélection. Il ne consulte aucun visuel préparé et n’appelle aucun moteur. Un haut remplace le haut actuel, un pantalon remplace le pantalon actuel, une veste occupe son propre emplacement. Une robe remplace le haut et le bas. Un retrait conserve les autres pièces. Les essais en navigateur contrôlent ces transitions sur ordinateur et mobile.

La sélection courante et les articles du dernier rendu affiché sont deux états distincts dans la page. Une sélection modifiée est signalée tant qu’un rendu correspondant n’a pas été reçu et chargé. Une erreur de calcul conserve le dernier rendu et la nouvelle sélection, avec leur différence explicitement indiquée. Le prototype permet de sélectionner des vestes mais refuse leur calcul. Les catégories documentées du moteur v1.5 et de l’API v1.6 ne fournissent pas un emplacement distinct de veste superposée. Cette capacité reste à évaluer avec un moteur adapté.

Le script `verify-composition.mjs` importe Hoodie Sable, Dune, Rivage, Wild Cards, Atelier et Nomade via `/import`, sous de nouveaux identifiants. Ces photos proviennent du catalogue de démonstration, sans échantillon physique de magasin. Il vérifie neuf transitions de sélection et tente cinq calculs gratuits indépendamment des échecs précédents. Il refuse le fournisseur payant. Le journal `evidence/composition-validation.json` enregistre les résultats réels du 14 novembre.

| Calcul tenté après import | Résultat | Durée |
|---|---|---:|
| Hoodie Sable seul | HTTP 502, erreur du démonstrateur sans détail | 8,38 s |
| Hoodie Sable + Dune | HTTP 502, aucune sortie | 0,88 s |
| Hoodie Sable + Rivage | HTTP 502, aucune sortie | 0,88 s |
| Remplacer le hoodie par Wild Cards, conserver Rivage | Sélection correcte, HTTP 502 au calcul | 0,96 s |
| Retirer le haut, conserver Rivage | Sélection correcte, HTTP 502 au calcul | 0,53 s |

La signature publique `/gradio_api/info` a été relue. Les huit paramètres envoyés par l’adaptateur correspondent à l’ordre annoncé. Les échecs actuels empêchent même le premier passage sur le mannequin de référence. Aucune conservation de couleur, motif ou vêtement lors d’un second passage ne peut être conclue pour ces essais. Les trois tests Chromium, dont deux aux largeurs 1440 et 390 pixels, passent pour la gestion de sélection, l’indisponibilité de calcul et la conservation du dernier rendu.

Pour reprendre les calculs, il faut soit un accès fournisseur utilisable, soit un hébergement GPU du modèle libre. Le pilote API v1.6 exige une clé serveur et un budget explicitement autorisé. Il garde une entrée vêtement par appel, donc la qualité de la composition successive doit encore être mesurée. Try-On Max documente un produit par appel et des instructions de style. Son aptitude à préserver toutes les pièces importées lors des modifications reste également à tester. Une simple activation d’API ne valide aucune de ces capacités. Aucun appel payant n’a été effectué.

Le serveur de relecture utilisé pour ces tests peut être lancé avec `VTON_PORT=3198`, `VTON_PROVIDER=off`, `VTON_REPLAY_EVIDENCE=1` et `VTON_REQUESTS_PER_MINUTE=120` pour le volume des tests locaux. Fournir ensuite `VTON_TEST_URL=http://127.0.0.1:3198` à Playwright. La limite habituelle reste de 20 requêtes d’écriture par minute. Pour les vrais essais gratuits, lancer un serveur distinct avec `VTON_PROVIDER=free`, sans variable de relecture, puis exécuter `node prototypes/try-on/verify-composition.mjs` en fournissant son URL dans `VTON_TEST_URL`.

La vérification d’interface utilise `VTON_PROVIDER=off`, `VTON_REPLAY_EVIDENCE=1`, `VTON_PORT=3196` et un dossier de données séparé. Exécuter `npx playwright test tests/vton-prototype.spec.ts` avec `VTON_TEST_URL=http://127.0.0.1:3196` pendant que ce serveur fonctionne. Elle contrôle le cache, le refus d’une combinaison absente, la conservation de l’image, le retrait et un import sans moteur. Elle ne constitue pas une validation de qualité du moteur.

Les articles sont les références actuelles de Maison Édit, dont les photos de catalogue sont des visuels de démonstration, pas des échantillons physiques. Pour chaque essai gratuit, les images ont été normalisées en PNG sur fond uni, sans retouche des vêtements. Réglages v1.5 : 20 étapes, guidance 1,5, seed 42, mode sans segmentation, photo traitée comme flat-lay bien qu’elle présente un cintre. Temps relevés de l’envoi au téléchargement du résultat, côté serveur.

| Parcours | Mesure | Inspection |
|---|---:|---|
| Alpine Blanc | 23,6 s | Mannequin et blanc reconnaissables, paysage repris. La coupe paraît plus ajustée et les manches plus courtes. Traces brunes de cintre au col. |
| Rivage Olive | 7,2 s | Olive et plis de taille reconnaissables. Le cintre est resté apparent et le pantalon s’arrête sous le genou. Rendu insuffisant pour la fiche. |
| Robe Lumière Ivoire | 25,2 s | Col carré, bretelles et silhouette évasée repris. Plis et texture simplifiés. Les mains et la surface plastique sont légèrement réinterprétées. |
| Alpine + Rivage | Deux tentatives de seconde passe, ~1,4 s chacune avant échec | Le démonstrateur a émis un événement d’erreur sans détail ni image. Impossible de mesurer la conservation du haut. |
| Remplacement avec Wild Cards | Échec en ~0,9 s | Tentative sur le résultat Rivage seul. Aucune image pour juger la conservation du pantalon. Le quota est une hypothèse, le service n’a pas donné de motif. |
| Retrait | Validé dans Chromium avec le cache | Retour au mannequin de référence sans appel fournisseur. Le retrait d’une seule pièce depuis une tenue complète calculée reste à valider. Son chemin prévu reconstruit la sélection restante et réutilise sa photo de cache si elle existe. |

Le mannequin femme en plastique est accepté par la démo. L’identité reste reconnaissable sur les trois images. Aucun article de cet essai ne permet de conclure sur la fidélité d’un logo textuel. Le paysage d’Alpine sert à évaluer un motif graphique. Le mannequin homme, les photos de fournisseurs externes et l’API v1.6 n’ont pas été évalués visuellement.

## Composition, conservation et limites

Une robe remplace le haut et le bas. Pour haut + bas, le serveur repart du mannequin initial, applique le haut, puis applique le pantalon à l’image obtenue. L’ordre reste fixe quel que soit l’ordre de sélection. Un remplacement recalcule les étapes qui changent. Le retrait ne demande jamais au moteur d’effacer une pièce d’une ancienne image. Une erreur conserve la photo précédente. Ce protocole est expérimental et ne marque pas une sortie comme validée pour la vente.

Le cache SQLite est isolé par identifiant de magasin. Sa clé inclut le profil d’inférence, la vue, l’empreinte du mannequin, les identifiants et références des variantes, les empreintes de photos et l’ordre des pièces. L’import ajoute une révision de variante comme donnée, sans modification du code. La démo autorise 20 requêtes d’écriture par minute, un calcul concurrent dans le processus et, par défaut, huit tentatives par magasin sur 24 h. SQLite persiste la réserve de crédits cumulée. Le serveur écoute uniquement sur l’interface locale.

Pour une version multi-magasins, l’identité de magasin doit provenir de l’authentification serveur. Prévoir un stockage privé des photos et rendus, une base de catalogue avec identifiants produit et variante stables et révisions immuables, une file de tâches avec déduplication, limites partagées entre instances et registre des coûts. Un parcours d’import devra demander des photos à plat ou sur mannequin invisible, éviter les cintres visibles et prévoir une validation marchande avant publication. Les résultats restent des illustrations, sans estimation de taille.

La rotation doit faire l’objet d’une étude séparée avec des vues coordonnées ou un mannequin et des vêtements 3D réalistes. Les sorties testées ici montrent une seule face.

## Décision proposée

Poursuivre un pilote pour une pièce à la fois. Repousser la refonte de la cabine tant que la qualité sur les photos d’import et la tenue composée ne sont pas mesurées. Après validation d’un budget : comparer photos sur cintre et sans cintre, tester un haut avec logo lisible, ajouter un pantalon, remplacer chaque emplacement et retirer une pièce. Comparer le rendu successif avec les essais simples et noter couleur, motif, logo, manches, ourlet, position des mains, conservation de l’autre vêtement et délai. Six appels v1.6 suffisent pour un premier parcours (trois pièces seules, seconde passe pantalon, deux passes de remplacement), soit 0,45 USD de crédits consommés si tous réussissent, avec un premier achat de 7,50 USD si aucun solde n’existe.
