# Note d'intention — Inspecteur NEREIS-7

## Le projet

*Inspecteur NEREIS-7* est le volet **tablette** d'une expérience de jeu d'enquête
coopérative à deux joueurs, développée dans le cadre du projet **« Crimes & Sciences »**.
Là où un premier joueur plonge dans le sous-marin de recherche *NEREIS-7* en **réalité
virtuelle**, ce second joueur reste à la surface : il est l'**inspecteur** qui reçoit les
objets exhumés et les passe au crible pour reconstituer ce qui est arrivé à l'équipage
disparu.

L'application n'est pas un jeu autonome. Elle est conçue comme **l'outil de travail d'un
enquêteur** : une interface d'analyse crédible, immersive, qui transforme la tablette en
instrument de terrain.

## Pourquoi cette forme

### La coopération asymétrique au cœur du dispositif
Le pari du projet est de faire **collaborer deux joueurs aux rôles radicalement différents**.
L'un agit (VR), l'autre comprend (tablette). Aucun des deux ne peut résoudre l'enquête seul :
le joueur VR récupère les objets physiques mais ne peut pas les déchiffrer ; l'inspecteur
détient les outils d'analyse mais dépend de ce qu'on lui apporte. La tablette matérialise
ce **pont entre l'action et la déduction**.

### Le pont entre le réel et le numérique
Le choix de la **reconnaissance d'objets par IA** (Teachable Machine / TensorFlow.js) n'est
pas un gadget : il ancre le jeu dans le **monde physique**. L'objet tendu par le coéquipier
existe vraiment ; le scanner le fait entrer dans la fiction. Ce geste — pointer, scanner,
identifier — crée un moment de **friction tangible** entre les deux univers, là où un simple
clic dans un menu n'aurait rien produit.

### Révéler plutôt que montrer
Chaque indice se **mérite**. Les informations ne sont pas affichées : elles sont cachées,
puis dévoilées par une manipulation (gratter une page pour révéler une encre réactive,
décoder, déchiffrer…). L'intention est de placer le joueur dans la **posture active de
l'enquêteur**, qui fouille et met au jour, plutôt que dans celle d'un lecteur passif.

## Le parti pris esthétique

L'interface adopte un registre **« terminal d'investigation »** : fond bleu nuit abyssal,
typographie monospace, vocabulaire technique (rôle, modèle, résolution optique, confiance
de détection), animations de boot et de scan. Tout concourt à faire croire à un **véritable
équipement professionnel**, cohérent avec l'ambiance sous-marine et le sérieux d'une enquête.

Cette direction sert l'immersion : l'inspecteur ne « joue » pas à analyser, il **analyse**.

## Les contraintes assumées

- **100 % hors-ligne.** L'expérience est pensée pour un cadre maîtrisé (salon, événement,
  démonstration) où la connexion n'est jamais garantie. Modèle IA, polices et assets sont
  embarqués localement, en PWA comme en APK Android. La fiction ne doit jamais se briser
  sur un écran de chargement réseau.
- **Tablette, plein écran, paysage.** Le format est choisi pour un usage posé, à deux mains,
  à côté du casque VR — un poste de commande, pas un téléphone qu'on consulte.
- **Performance.** Chargement différé des écrans et découpage des dépendances lourdes
  (3D, IA) pour un démarrage rapide, condition d'une mise en scène fluide.

## En résumé

L'intention est de créer un objet à mi-chemin entre le **jeu d'enquête** et l'**outil
d'investigation crédible**, qui donne à un joueur non-VR un rôle aussi engageant que celui
de son coéquipier immergé — et qui fasse de l'analyse, du déchiffrement et de la collecte
d'indices une expérience **manuelle, sensible et coopérative**.
