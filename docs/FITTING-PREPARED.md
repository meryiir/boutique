# Studio d’essayage photo

Le studio conserve une tenue en mémoire pour la visite de la page. Changer de page ou de genre termine cette session. Les filtres, le tri et les ancres de la même page conservent la tenue. Le chargement d’une photo commencé avant la sortie ne peut plus réappliquer la tenue. Un lien d’essayage explicite transmet un article et une couleur, puis la demande est retirée de l’adresse après lecture.

Les valeurs de genre du catalogue restent celles des données produit. Les 19 références mixtes ont maintenant un rendu initial sur chaque mannequin. Dans une collection filtrée, les références mixtes utilisent le mannequin du filtre. Sur une fiche mixte ouverte séparément, le mannequin de la photo studio originale est utilisé. Les références Femme et Homme utilisent leur genre déclaré.

Haut, pantalon, veste, sac et écharpe occupent chacun leur emplacement. Une robe ou un ensemble prend la place du haut et du pantalon. La veste et les accessoires restent sélectionnés si un visuel complet existe. L’ajout, le changement de couleur portée et le retrait valident le rendu exact et attendent son décodage. Si ce rendu manque ou échoue, la dernière tenue reste visible. Dans l’aperçu rapide, le message apparaît dans la fenêtre ouverte.

Le registre data/prepared-looks.ts et les fichiers JSON associés définissent les associations validées. Le nouvel inventaire docs/INVENTAIRE-ESSAYAGE.json indique les ressources par article, variante, mannequin, point d’entrée et tenue. Il couvre 32 références, 97 variantes et 154 couples variante/mannequin autorisés. Parmi eux, 59 ont un rendu individuel et 95 restent à produire. Les 51 couples correspondant aux couleurs initiales sont couverts et 16 tenues de plusieurs articles sont disponibles.

Les 31 nouveaux rendus de data/fitting-coverage-looks.json ont été préparés avec ImageGen intégré, puis convertis en WebP. La consigne utilisait le mannequin ivoire et la photo de vêtement comme références, avec conservation de la pose, de l’identité et du cadrage, et reproduction de la couleur, de la coupe et des coutures. Pour les tenues, elle préservait les pièces déjà portées et ajoutait celles du second visuel. Les plis et finitions restent des reconstitutions.

La galerie tourne le vêtement seul pour certains hoodies. Une rotation du mannequin habillé demande les profils droit et gauche et le dos de chaque tenue, avec le même mannequin, ou des modèles réalistes du mannequin et des vêtements. Les visuels de face disponibles ne permettent pas cette rotation.

Les régressions sont couvertes par tests/fitting-session.spec.ts, tests/fitting-catalog-matrix.spec.ts, tests/fitting-photo.spec.ts et tests/full-product-audit.spec.ts.
