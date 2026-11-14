# Pilote FASHN API plafonné à 10 crédits

Le pilote utilise `tryon-v1.6`, un résultat PNG par appel et le mannequin femme en plastique du prototype. L’activation dans la boutique publique dépendra de l’inspection des sorties réelles. La clé est chargée par Node côté serveur. Le plafond et le verrou sont contrôlés avant chaque création de tâche distante.

## Configurer la clé

Le fichier local a été créé à cet emplacement.

`C:\Users\pc\Documents\boutique\prototypes\try-on\.env.fashn-pilot.local`

Ouvrir ce fichier dans un éditeur et renseigner uniquement la valeur de `FASHN_API_KEY`. Conserver `VTON_PAID_AUTHORIZED=0` jusqu’à l’autorisation explicite du pilote. La clé doit rester dans ce fichier local, sans être collée dans la discussion. Le fichier est ignoré par Git et se trouve hors de `public`. Le serveur sert uniquement les fichiers et routes déclarés. Il ne renvoie jamais la valeur de la clé.

Depuis la racine du projet, cette commande affiche uniquement le chemin de configuration, la présence de la clé, l’autorisation et les compteurs de crédits. Elle ne contacte pas FASHN.

```powershell
node prototypes/try-on/fashn-pilot.mjs check
```

Une clé configurée et une autorisation sont deux conditions distinctes. Avec l’autorisation à zéro, le serveur peut être démarré pour vérifier son interface mais les créations de tâches restent bloquées.

```powershell
node prototypes/try-on/fashn-pilot.mjs serve
```

L’interface locale est servie à `http://127.0.0.1:3199`. Le port peut être changé dans le fichier local. La modification du fichier exige le redémarrage du serveur. Les essais payants ne doivent être lancés qu’après configuration et accord explicite. À ce moment, passer `VTON_PAID_AUTHORIZED` à `1`, redémarrer le serveur puis lancer dans un autre terminal.

```powershell
node prototypes/try-on/fashn-pilot.mjs run
```

Le lanceur fixe le fournisseur FASHN, le budget à 10 crédits, le magasin du pilote et les données persistantes du pilote. Il refuse le mode de relecture. Un lancement avec l’autorisation à zéro échoue avant tout calcul.

## Plafond et persistance

Le registre est conservé dans `prototypes/try-on/.data/fashn-pilot/credits.sqlite`. Ne pas supprimer ce fichier ni les données du pilote pendant les essais. Il est commun à tous les magasins et processus payants exécutant ce prototype. Changer `VTON_DATA_DIR` ou le magasin ne remet pas son compteur à zéro. Le code refuse un budget supérieur à 10.

Chaque création de tâche réserve un crédit dans une transaction SQLite avant l’appel. Les réservations restent comptées après un échec ou un délai dépassé, car le coût distant peut être incertain. Ce total peut donc dépasser la facturation effective du fournisseur. Une tâche inconnue ou déjà soumise empêche un doublon automatique du même calcul. Les identifiants FASHN sont enregistrés dès réception pour permettre d’en vérifier le statut. Il faut examiner les tâches incertaines avant de décider de nouvelles tentatives. Le pilote n’effectue aucune relance automatique de génération.

Le modèle, la catégorie et `num_samples=1` sont contrôlés côté serveur. Les résultats identiques sont réutilisés depuis le cache FASHN de ce pilote. Les limites de requêtes et de générations sur 24 h restent également actives. Le plafond de crédits cumulé ne se réinitialise pas après 24 h.

Au tarif officiel consulté le 14 novembre 2026, v1.6 coûte un crédit par sortie et un crédit coûte 0,075 USD. Dix crédits correspondent à 0,75 USD de générations au maximum pour ce protocole. L’achat minimum du fournisseur est de 7,50 USD pour 100 crédits. L’achat et les appels sont deux opérations distinctes. Aucun achat ni appel payant n’a été réalisé pendant la préparation. [Prix officiels](https://help.fashn.ai/plans-and-pricing/api-pricing)

## Parcours et preuves

Les quatre photos de Hoodie Sable Terre, Dune Sable, Rivage Olive et Wild Cards Rose sont importées via HTTP sous leurs propres identifiants. Ce sont les photos du catalogue de démonstration, sans échantillon physique fourni par un magasin. Les identifiants sont conservés dans le manifeste pour une reprise du pilote. Les versions des photos, les variantes et l’empreinte du mannequin participent au cache.

| Cas demandé | Construction du rendu | Appels prévus avec le cache |
|---|---|---:|
| Hoodie Sable seul | Mannequin fixe + Hoodie Sable | 1 |
| Hoodie Sable + Dune | Résultat réel du hoodie + Dune | 1 |
| Remplacer Dune par Rivage | Résultat réel du hoodie + Rivage | 1 |
| Remplacer le hoodie par Wild Cards, conserver Rivage | Mannequin fixe + Wild Cards, puis Rivage | 2 |
| Retirer le haut, conserver Rivage | Mannequin fixe + Rivage seul | 1 |

Le parcours prévoit six crédits si tous les calculs aboutissent dès le premier passage. Les autres crédits restent disponibles dans le plafond autorisé et ne sont pas consommés automatiquement pour améliorer une image. La reconstruction depuis le mannequin fixe limite l’accumulation des transformations. La conservation fidèle des pièces est à inspecter malgré cette reconstruction.

`evidence/fashn-pilot/manifest.json` enregistrera les cas, statuts HTTP, délais, identifiants de tâches, paramètres et empreintes des images. Chaque appel terminé conservera sa sortie PNG brute, son image mannequin d’entrée et sa photo de vêtement d’entrée. Les copies des entrées sont vérifiées par SHA-256 contre le journal serveur. Les rendus finaux de chaque tenue sont aussi enregistrés. La sortie brute originale reste conservée séparément de la version normalisée employée pour la passe suivante.

Tous les résultats restent marqués `pending_inspection` après une réussite HTTP. L’inspection doit comparer les sorties aux photos importées et aux autres étapes du parcours pour vérifier la couleur, les motifs, les détails du hoodie, les manches, le col, les poches, les coutures, la longueur des jambes et les proportions. Elle doit aussi vérifier l’identité du mannequin, l’absence de cintre résiduel et la fidélité du pantalon après remplacement ou retrait du haut. Une tenue complète doit conserver les détails du haut après l’application du pantalon. Une différence visible doit être décrite avant la décision d’intégration.

## Vestes et décision d’intégration

Les vestes restent hors des cinq essais payants. Leur sélection fonctionne dans le prototype mais le moteur actuel refuse leur rendu. v1.6 documente les catégories haut, bas et pièce entière. Il faut évaluer séparément une veste portée par-dessus un haut en conservant le pantalon et les détails de chaque pièce. Try-On Max peut être une piste à comparer, mais sa documentation décrit aussi une image produit par appel. La superposition fidèle ne peut pas être conclue à partir de ce schéma. [FASHN v1.6](https://docs.fashn.ai/api-reference/tryon-v1-6), [Try-On Max](https://docs.fashn.ai/api-reference/tryon-max)

Si la qualité des cinq cas est suffisante, le raccordement ultérieur doit reprendre les états de chargement et d’erreur, les sélections indépendantes et le cache. Il demandera un service Node persistant avec HTTPS sortant et un stockage durable, sans GPU local pour l’API hébergée. Le prototype reste limité à l’accès local pendant ce pilote. Si la qualité échoue, documenter les différences observées puis comparer un autre moteur avant toute intégration. Toute dépense supplémentaire ou pour les vestes exige un accord distinct.

## Vérifications de préparation

```powershell
node --test prototypes/try-on/pilot.test.mjs
```

Les cinq tests utilisent des clés factices et une API simulée. Les tests de protocole exécutent une copie isolée du serveur sous `.data/pilot-test-*`. Ils ne contactent pas FASHN, ne remplissent pas le registre réel et ne créent aucune preuve visuelle du pilote. Ils vérifient le verrou, la persistance, dix crédits au maximum avec des processus concurrents, les cinq cas et les six appels prévus, l’enregistrement des sorties brutes et l’absence de clé dans les réponses au navigateur. La qualité du moteur reste à valider après autorisation avec les images effectivement calculées.
