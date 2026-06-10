# Inspecteur — NEREIS-7

Application tablette de l'expérience **« Crimes & Sciences »**. Elle incarne le poste de
l'**inspecteur** : pendant qu'un coéquipier explore le sous-marin *NEREIS-7* en réalité
virtuelle et lui transmet des objets physiques, l'inspecteur les **scanne**, les **analyse**
et consigne les indices révélés dans son **carnet d'enquête**.

L'application fonctionne **100 % hors-ligne** (PWA + APK Android), pensée pour tourner sur
une tablette posée à côté du casque VR.

---

## Le jeu en bref

1. **Connexion** à l'interface d'analyse (identifiants in-game).
2. **Briefing** : le sous-marin de recherche NEREIS-7 a été retrouvé intact, à la dérive,
   son équipage disparu. L'inspecteur doit élucider l'incident.
3. **Scanner un objet** : on pointe la caméra de la tablette vers l'objet physique remis par
   le joueur VR. Un modèle **Teachable Machine** (TensorFlow.js) l'identifie en temps réel.
4. **Analyser l'indice** : chaque objet ouvre une mini-interaction (encre révélée au grattage,
   décodage, etc.) qui dévoile une information cachée.
5. **Carnet d'enquête** : chaque indice analysé est collecté. Une fois les **5 indices**
   réunis, l'enquête est résolue.

### Les indices

| Objet | Modèle IA (label) | Analyse |
|-------|-------------------|---------|
| 📖 Manuel de bord | `carnet` | Notes manuscrites révélées à l'encre réactive |
| 🚨 Boîtier d'alarme | `alarme-incendie` | Analyse du boîtier |
| 📼 Cassette / Dictaphone | `cassette` | Écoute / décodage audio |
| 📹 Caméra de surveillance | `camera` | Analyse des images |
| 🔑 Disque dur chiffré | `disque-dur` | Déchiffrement |

---

## Stack technique

- **React 18** + **TypeScript** + **Vite 6**
- **TensorFlow.js** + **@teachablemachine/image** — reconnaissance d'objets à la caméra
- **three.js / @react-three/fiber / drei** — rendu 3D
- **Capacitor 8** — packaging Android (APK)
- **PWA** — service worker offline + manifest plein écran paysage

Le code est découpé en vues chargées en *lazy loading* (`React.lazy` / `Suspense`) pour un
démarrage rapide ; les *chunks* `vendor-react` et `vendor-three` sont séparés au build.

---

## Structure du projet

```
src/
  App.tsx                  Routeur d'écrans (login → onboarding → home → scan → analysis)
  main.tsx                 Point d'entrée
  registerServiceWorker.ts Enregistrement du SW offline
  components/
    LoginView.tsx          Écran de connexion (boot animé)
    OnboardingView.tsx     Briefing narratif (slides)
    ScanView.tsx           Caméra + détection Teachable Machine
    CarnetView.tsx         Carnet d'enquête (progression des indices)
    *Analysis.tsx          Analyses interactives par objet (Manuel, Alarme, Caméra…)
    HelpButton.tsx         Aide contextuelle
public/
  model/tm-my-image-model-v2/  Modèle IA entraîné (model.json, weights.bin, metadata.json)
  manifest.webmanifest         Manifest PWA
  offline-sw.js                Service worker (cache offline)
```

---

## Démarrage

Prérequis : **Node.js 18+**.

```bash
npm install        # installe les dépendances

npm run dev        # serveur de dev (Vite, --host pour accès réseau local)
npm run build      # build de production (tsc + vite)
npm run preview    # prévisualise le build
```

> ⚠️ Le scan nécessite l'accès **caméra**. Les navigateurs n'autorisent `getUserMedia`
> qu'en **HTTPS** ou sur `localhost`. Pour tester sur une tablette en réseau local,
> servir en HTTPS ou passer par l'APK Android.

---

## Build Android (APK)

L'app est embarquée dans une coque Capacitor (`appId: fr.nereis.inspecteur`).

```bash
npm run android:add    # première fois : ajoute la plateforme Android
npm run android:sync   # build web + sync vers le projet Android
npm run android:apk    # génère l'APK debug (scripts/build-android-debug.cmd)
```

L'APK produit fonctionne **sans connexion** : modèle IA, polices et assets sont packagés
en local.

---

## Identifiants de connexion (in-game)

L'écran de connexion fait partie de la mise en scène :

- **Utilisateur** : `INSPECTEUR`
- **Mot de passe** : `ABYSSE7`

---

## Mode debug

Ajouter `?debug` à l'URL active le mode debug (indicateur visible sur l'écran d'accueil),
utile pour tester les écrans sans passer par le scan.
