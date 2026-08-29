# Revue complète des packages Tour

Date : 28 août 2026  
Périmètre : `packages/core`, `packages/styles`, `packages/react`, `packages/vue`, `packages/angular`, `packages/solid`, `packages/vanilla`, ainsi que leurs scripts de build, de test, de packaging et de release.

## Résumé exécutif

Le moteur est nettement plus solide que sa surface publique. Le cœur gère correctement les workflows immuables, les états concurrents, l'annulation, les transitions, l'isolation des racines, le nettoyage DOM et une grande partie du focus. La base technique est saine et les tests unitaires sont inhabituellement complets pour un package encore en phase `dev`.

En revanche, l'objectif produit « flexibilité + simplicité, complexité cachée » n'est pas encore atteint :

- le chemin nominal oblige à assembler manuellement une dizaine de primitives ;
- une composition incomplète peut produire un tour actif mais invisible, sans erreur utile ;
- plusieurs options publiques sont acceptées mais n'ont aucun effet ;
- `core` publie une factory qui n'est pas utilisable seule par un consommateur normal ;
- les capacités et exports divergent entre frameworks ;
- la documentation publiée est fausse ou incomplète sur plusieurs points ;
- deux choix de focus/modalité limitent fortement le contenu riche et l'accessibilité ;
- le gate `test:tarballs` de la CI échoue actuellement.

Verdict : **bonne fondation, mais NO-GO pour une release de production en l'état**. Le blocage immédiat est petit à corriger. La priorité produit doit ensuite être de créer un vrai chemin simple sans retirer les primitives avancées.

## Principes recommandés

1. **Simple par défaut** : un composant prêt à l'emploi doit couvrir le cas standard.
2. **Flexible par composition** : les primitives actuelles restent disponibles pour les cas avancés.
3. **Aucune configuration silencieuse** : une option fonctionne, avertit clairement, ou n'existe pas.
4. **Parité de capacités, syntaxe native** : les adapters peuvent conserver les conventions de leur framework, mais doivent offrir les mêmes possibilités.
5. **Core interne clairement séparé du core consommateur** : le bridge réel doit être supporté et partagé, sans exposer les détails au chemin nominal.

## État des validations

| Validation | Résultat |
| --- | --- |
| `bun run check` | Passe, 109 fichiers vérifiés |
| `bun run typecheck` | Passe |
| `bun test` | Passe, 236 tests |
| `bun run test:browser` | Passe, 64 tests sur Happy DOM |
| `bun run build` | Passe, 7 distributions générées |
| `bun run pack` | Passe, 7 tarballs générés |
| `bun run --cwd apps/playground build` | Passe |
| `bun run release:prepare` | Passe |
| `bun run release:publish -- --dry-run` | Passe |
| `bun run test:tarballs` | **Échoue** : la fixture appelle `.delay(0)`, méthode supprimée |

Important : le script nommé `test:browser` n'utilise pas un navigateur réel. Il exécute Bun avec la condition `browser` et Happy DOM ([scripts/test-browser.ts](scripts/test-browser.ts#L4)). Les résultats ne valident donc pas le layout natif, le focus réel, le scroll, les Custom Elements dans Chromium/WebKit/Firefox, ni l'annonce par lecteur d'écran.

## Forces confirmées

### Architecture du cœur

- Les dépendances vont dans le bon sens : adapters vers `core`, frameworks en peer dependencies, styles séparés.
- Les définitions de workflow sont figées et séparées de l'état mutable d'une exécution ([workflow-definition.ts](packages/core/src/definition/workflow-definition.ts#L82)).
- Le contrôleur est instance-first, annule les opérations obsolètes et publie des snapshots readonly ([tour-controller.ts](packages/core/src/runtime/tour-controller.ts#L64)).
- Le montage protège l'unicité d'une racine, réserve les IDs et rollback correctement une connexion partielle ([root-bridge.ts](packages/core/src/runtime/root-bridge.ts#L120)).
- Les transitions, erreurs, callbacks réentrants, timeouts, démontages et remplacements de workflow sont largement couverts par les tests.

### Adapters et DOM

- Chaque adapter utilise les primitives natives de son framework et spécialise correctement le type de contenu.
- Les relations `role="dialog"`, `aria-labelledby`, `aria-describedby` et `aria-controls` sont présentes dans les cinq adapters.
- Overlay et pointer sont correctement retirés de l'arbre d'accessibilité.
- Les contrôles sont de vrais boutons avec `type="button"`, nom accessible et état disabled cohérent.
- Les sélecteurs `data-glow-tour-*` forment un contrat de styling commun et indépendant du framework.

### Focus et animation

- Le focus initial est directionnel, Tab boucle, Escape respecte `cancellable`, et le focus du lanceur est restauré ([focus-guard.ts](packages/core/src/state/focus-guard.ts#L44)).
- Les animations du runtime respectent `prefers-reduced-motion`.
- Le driver évite une partie des écritures de géométrie inutiles et coalesce les repositionnements.

### Packaging et release

- Les sept packages sont versionnés ensemble avec Changesets.
- Les dépendances `workspace:*` sont réécrites vers des versions publiables.
- L'ordre de publication est déterministe et le script sait reprendre après un échec partiel.
- La release est déclenchée par une GitHub Release stable et utilise des actions pinées avec des permissions minimales.
- Les tarballs sont installés dans un projet consommateur isolé, ce qui est la bonne stratégie même si la fixture est actuellement obsolète.

## Findings prioritaires

### P0 — Le gate de release `test:tarballs` est rouge

La fixture consommateur appelle `.delay(0)` ([test-tarballs.ts](scripts/test-tarballs.ts#L190)), alors que l'API publique expose désormais `.wait(...)` ([builder/index.ts](packages/core/src/builder/index.ts#L218)). Le rerun avec accès npm réel échoue au typecheck :

```text
consumer.ts(12,4): error TS2339: Property 'delay' does not exist on type 'WorkflowStepBuilder<string>'.
```

Impact : la CI et le workflow de release exécutent tous deux ce gate ([ci.yml](.github/workflows/ci.yml#L29), [release.yml](.github/workflows/release.yml#L53)). Une release ne peut donc pas passer avec l'état actuel de `main`.

Recommandation : remplacer la fixture legacy par `.wait(0)`, puis exécuter la chaîne complète de CI. Ajouter un test ou une fixture unique comme source de vérité pour éviter que les exemples consommateurs dérivent de l'API.

### P0 conditionnel — La première publication npm nécessite encore son workflow d'amorçage

Le workflow permanent utilise uniquement Trusted Publishing/OIDC ([release.yml](.github/workflows/release.yml#L7)). Le guide reconnaît qu'un Trusted Publisher ne peut être configuré qu'après l'existence du package et demande un workflow temporaire avec token granulaire ([RELEASING.md](RELEASING.md#L23)). Ce workflow temporaire n'est pas présent.

Impact : si les sept packages n'existent pas encore sur npm, le workflow permanent ne peut pas réaliser leur toute première publication. La recherche publique n'a pas permis de confirmer de manière fiable leur existence actuelle ; ce point reste donc conditionnel.

Recommandation : avant la première release seulement, ajouter un workflow GitHub Actions temporaire et explicitement protégé, utiliser un token npm granulaire à durée courte, publier les sept packages, configurer OIDC, révoquer le token et supprimer le workflow. Ne pas publier localement.

### P1 — Des options publiques sont inertes

`PopoverOptions` expose `hideProgressIndicator` et `buttons` ([types/index.ts](packages/core/src/types/index.ts#L75)). Elles sont fusionnées mais aucune primitive ni aucun runtime ne les consomme. Les labels sont en réalité configurés directement sur les triggers.

Impact : l'utilisateur obtient une configuration valide TypeScript qui ne produit aucun changement. C'est l'inverse d'une complexité bien cachée : la bibliothèque donne une fausse impression de contrôle.

Recommandation : supprimer ces champs pendant la phase `dev`. Réintroduire `hideProgressIndicator` uniquement avec une primitive `Progress` réelle. Conserver les labels au niveau des composants si c'est la source de vérité retenue.

### P1 — Il n'existe pas de vrai chemin simple

L'exemple minimal demande de monter `Root`, `Overlay`, `Pointer`, `Popover`, `Header`, `Content`, `Footer` et trois triggers ([README.md](README.md#L27)). Le runtime ne vérifie que la connexion de la racine ([root-bridge.ts](packages/core/src/runtime/root-bridge.ts#L235)). Un `Root` sans popover/overlay peut lancer un workflow et atteindre l'état `active` sans rien afficher.

Impact : le cas standard est verbeux, et le principal montage incorrect échoue silencieusement. La flexibilité existe, mais la simplicité et le masquage de complexité non.

Recommandation : ajouter une composition prête à l'emploi dans chaque adapter, par exemple `GlowTour.Default` / `DefaultTour`, qui assemble la structure standard. Garder toutes les primitives actuelles pour le mode headless/composable. En développement, avertir ou échouer clairement si aucune présentation n'est connectée lors de `run()`.

API cible indicative :

```tsx
const tour = createGlowTour();

<GlowTour.Default tour={tour} />
```

Le chemin avancé actuel resterait disponible :

```tsx
<GlowTour.Root tour={tour}>
  {/* composition entièrement personnalisée */}
</GlowTour.Root>
```

### P1 — La frontière publique de `core` est incohérente

`@glowhop/core-tour` exporte `createGlowTour` comme seule valeur runtime ([index.ts](packages/core/src/index.ts#L8)), mais `run()` exige un root connecté via un bridge privé. Un consommateur de `core` seul ne dispose d'aucune API supportée pour connecter ce root. Parallèlement, le client de bridge est copié dans chaque adapter, par exemple React et Vue ([adapter-bridge.ts](packages/react/src/adapter-bridge.ts#L1), [adapter-bridge.ts](packages/vue/src/adapter-bridge.ts#L1)).

Impact : le package dit être framework-agnostic mais sa factory publique n'est pas réellement autonome ; le vrai contrat adapter existe déjà, mais reste caché et dupliqué.

Recommandation : créer un sous-export supporté `@glowhop/core-tour/adapter` avec le bridge versionné, ses types et la connexion de root. Réserver ce sous-export aux adapters. Le chemin utilisateur normal doit continuer à importer la factory depuis son adapter.

### P1 — La documentation publiée est factuellement fausse et insuffisante

- Le README annonce `updateCurrentStep`, méthode explicitement supprimée ([README.md](README.md#L63)).
- Il annonce un polling à 50 ms alors que la valeur est 16 ms ([builder/index.ts](packages/core/src/builder/index.ts#L19)).
- Il pointe vers `project.md`, fichier absent ([README.md](README.md#L66)).
- Il n'explique pas l'import obligatoire du thème `@glowhop/styles-tour/default.css`.
- Le même README centré React est copié dans les sept tarballs ([build-packages.ts](scripts/build-packages.ts#L61)).
- Il ne documente presque aucune option avancée pourtant publique : stratégie de target absente, interaction, scroll, placements, callbacks, actions, événements ou mise à jour dynamique.

Impact : l'API semble plus simple qu'elle ne l'est, mais uniquement parce que ses capacités ne sont pas découvrables. Les consommateurs non React reçoivent un README inadapté.

Recommandation : maintenir une base commune courte et une section générée par package. Ajouter un exemple minimal, un exemple avancé, l'import CSS, une table API, la gestion des erreurs et un link-check. Compiler les snippets contre les tarballs.

### P1 — Le contenu riche est annoncé comme flexible mais ses contrôles sont exclus du focus

Le focus guard autorise dans le popover uniquement les triggers Glow Tour, pas l'ensemble des descendants focalisables ([focusable.ts](packages/core/src/state/focusable.ts#L24), [focus-guard.ts](packages/core/src/state/focus-guard.ts#L95)). Un lien, un champ ou un bouton rendu dans `Content` reçoit brièvement le focus puis en est expulsé. Ce comportement est même verrouillé par les tests.

Impact : le contenu riche accepté par ReactNode, VNode, JSX, TemplateRef et Node ne peut pas réellement contenir d'interactions clavier. Risque WCAG 2.1.1/2.1.2 et contradiction directe avec la flexibilité annoncée.

Recommandation : inclure tous les descendants réellement focalisables du popover dans le guard et le cycle Tab, en excluant seulement les racines de tours imbriquées si nécessaire.

### P1 — `aria-modal="true"` ne rend pas l'arrière-plan modal pour les technologies d'assistance

Le runtime pose `aria-modal` sur le popover ([tour-view-driver.ts](packages/core/src/dom/tour-view-driver.ts#L241)) et piège le focus clavier, mais ne rend pas le reste de l'application `inert` ou masqué de l'arbre d'accessibilité. Un lecteur d'écran en navigation virtuelle peut encore parcourir le fond.

Impact : la modalité annoncée ne correspond pas totalement au comportement réel. Les utilisateurs de lecteurs d'écran peuvent accéder à une interface censée être indisponible.

Recommandation : définir explicitement la zone applicative à neutraliser et gérer son inertness pendant les étapes modales, avec restauration exacte au cleanup. Valider sur VoiceOver/Safari, NVDA/Firefox et JAWS/Chrome avant de revendiquer la conformité.

### P1 — Les tests dits navigateur ne couvrent aucun navigateur réel

`test:browser` lance des fichiers Bun/Happy DOM ([test-browser.ts](scripts/test-browser.ts#L4)). Les mocks couvrent bien la logique, mais pas les vraies mesures de layout, le scroll natif, ResizeObserver, Web Animations, focus, Custom Elements et hydratation.

Impact : un bug propre à Chromium, Firefox ou Safari peut passer tous les gates. Pour une bibliothèque DOM cross-framework destinée à la production, c'est une lacune structurante.

Recommandation : ajouter un smoke Playwright en Chromium pour les cinq adapters : démarrage, navigation clavier, Escape, resize/scroll, remplacement de target et cleanup. Ajouter WebKit pour les risques focus/Custom Elements ; Firefox peut suivre ensuite.

### P1 — Vue ne passe pas le contrat d'acceptance commun

Le helper `runAdapterAcceptance` couvre isolation, racines multiples, mutation dynamique, modal/non-modal, clic et unmount ([adapter-acceptance.ts](scripts/adapter-acceptance.ts#L59)). React, Solid, Angular et Vanilla l'utilisent, mais pas Vue. Vue possède sa propre suite, sans prouver exactement le même contrat.

Impact : la promesse de parité inter-frameworks n'est pas protégée uniformément.

Recommandation : ajouter une fixture Vue au contrat commun avec deux `createApp`, deux roots et `nextTick` comme mécanisme de stabilisation.

## Findings importants mais non bloquants

### P2 — Les surfaces publiques divergent sans matrice de parité

- React et Solid exposent surtout le namespace `GlowTour`, Vue et Angular les primitives nommées.
- Vanilla ne réexporte ni l'alias `Tour` ni les types communs disponibles ailleurs.
- Vue permet de modifier `ariaLive`, React et Angular le fixent.
- Les props polymorphiques ne sont pas cohérentes entre adapters.

Recommandation : définir une matrice de capacités publiques. Chaque package devrait exposer la factory, le type `Tour`, les types courants, les primitives nommées, la composition par défaut et le mécanisme natif d'accès à l'état. La syntaxe peut rester idiomatique au framework.

### P2 — La prop polymorphique `as` est mensongère sur `Footer`

React inclut `as` dans `ElementProps`, mais `Footer` le transmet comme attribut au `<footer>` au lieu de changer de composant ([tour-components.tsx](packages/react/src/components/tour-components.tsx#L147)). Solid déclare la même possibilité puis force `footer` ([tour-components.ts](packages/solid/src/components/tour-components.ts#L206)).

Recommandation : supprimer `as` de `FooterProps`, solution la plus simple, ou l'implémenter réellement partout.

### P2 — L'adapter Vanilla modifie des méthodes et propriétés natives du bouton

Pour préserver la distinction entre disabled consommateur et disabled runtime, Vanilla redéfinit `disabled`, `setAttribute` et `removeAttribute`, puis ajoute un MutationObserver ([web-components.ts](packages/vanilla/src/components/web-components.ts#L643)).

Impact : risque de conflit avec instrumentation, wrappers, tests DOM ou autres bibliothèques décorant déjà ces instances. La complexité de maintenance est disproportionnée par rapport au besoin.

Recommandation : choisir une seule source explicite de vérité sur le host ou le bouton et observer les attributs, sans redéfinir les méthodes natives.

### P2 — L'enregistrement Vanilla est implicite et les conflits sont silencieux

Importer le package enregistre immédiatement les Custom Elements ([index.ts](packages/vanilla/src/index.ts#L6)). La fonction d'enregistrement n'est pas exportée à la racine et une définition étrangère utilisant le même nom est conservée silencieusement.

Recommandation : rendre l'entrée principale pure, exporter `registerGlowTourElements()`, et proposer `@glowhop/vanilla-tour/auto` pour l'effet automatique. Signaler clairement un nom déjà utilisé par un constructeur incompatible.

### P2 — Le thème par défaut ne style pas le bouton Cancel

Le README compose `CancelTrigger`, mais la feuille ne couvre que previous et advance ([default.css](packages/styles/default.css#L70)). Le bouton Cancel reste donc au style navigateur dans la composition documentée. Les tests de thème ne réclament pas non plus son sélecteur ([default.test.ts](packages/styles/default.test.ts#L16)).

Recommandation : ajouter Cancel aux règles communes, lui donner une hiérarchie visuelle secondaire/tertiaire, puis étendre le test.

### P2 — Le popover ne gère pas les faibles hauteurs ni le zoom 400 %

Le thème limite la largeur mais pas la hauteur ([default.css](packages/styles/default.css#L30)). Lorsque le contenu dépasse le viewport, les contrôles peuvent devenir inatteignables.

Recommandation minimale : `max-height: calc(100dvh - 32px)` et `overflow-y: auto`, puis test Playwright à 320 CSS px et zoom/reflow.

### P2 — L'annonce d'une nouvelle étape par lecteur d'écran est incertaine

Le contenu `aria-live="polite"` est mis à jour pendant que le popover parent peut encore être `aria-hidden` et `inert` durant la transition ([tour-view-driver.ts](packages/core/src/dom/tour-view-driver.ts#L263), [popover.ts](packages/core/src/elements/popover.ts#L372)). Certains lecteurs d'écran peuvent ignorer cette mutation.

Recommandation : valider l'annonce réelle sur les combinaisons AT ciblées. Si elle n'est pas fiable, ajouter une live region persistante hors du sous-arbre temporairement caché ou alimenter l'annonce après réapparition.

### P2 — Les tarballs testent peu le runtime réellement publié

La fixture importe les exports runtime de Core/React/Vue/Solid/Vanilla, mais pas Angular, puis compile surtout des types ([test-tarballs.ts](scripts/test-tarballs.ts#L173)). Elle ne lance pas un vrai tour depuis chaque artefact installé.

Recommandation : conserver le typecheck, puis ajouter un scénario DOM minimal par package construit, y compris bootstrap/unmount Angular.

### P2 — SSR et hydratation ne sont pas couverts uniformément

React est surtout testé à l'import sans globals DOM ; Vue et Solid rendent statiquement ; Angular n'a pas de scénario SSR/hydratation équivalent.

Recommandation : si SSR est une promesse supportée, ajouter pour chaque adapter un rendu serveur, une hydratation client et un démarrage de tour sans mismatch. Sinon, documenter précisément le niveau de support.

### P2 — Tree-shaking et side effects ne sont pas explicitement optimisés dans les manifests source

Les namespaces React/Solid référencent toutes les primitives et les manifests source n'affichent pas `sideEffects: false`, même si les manifests construits sont normalisés par le script. Vanilla, lui, a réellement un side effect d'enregistrement global.

Recommandation : exporter aussi les primitives nommées, garantir `sideEffects: false` pour Core/React/Vue/Solid dans les artefacts, et isoler l'entrée Vanilla auto pour que l'entrée pure soit tree-shakable.

## Nettoyage de complexité

### P3 — Types et artefacts résiduels

- `solid/src/trigger-types.ts` est une assertion de compilation qui produit un `.d.ts` vide dans la distribution.
- `StepConstructor` expose une forme interne avec `props`, différente de l'objet aplati de `.step()` ([types/index.ts](packages/core/src/types/index.ts#L265)).
- `WorkflowStatus`, `WorkflowState` et `WorkflowControls` semblent être des contrats legacy sans usage runtime actuel.
- Le client de bridge est dupliqué dans cinq adapters.

Recommandation : déplacer les assertions de types dans les tests, supprimer les types legacy tant que les breaking changes sont autorisés, définir directement `StepParameters`, et centraliser le bridge. Gain estimé par la revue de complexité : environ 230 lignes.

### P3 — Les tokens CSS polluent `:root`

Le thème déclare toutes les valeurs par défaut globalement sur `:root` ([default.css](packages/styles/default.css#L1)). Cela augmente le risque de collision et laisse des variables globales même lorsqu'aucun tour n'est monté.

Recommandation : poser les defaults sur `[data-glow-tour-root]` et garder la surcharge possible depuis un ancêtre.

### P3 — Le scroll smooth ignore la préférence de réduction de mouvement

Le runtime réduit ses animations, mais le scroll automatique utilise `smooth` par défaut ([tour-view-driver.ts](packages/core/src/dom/tour-view-driver.ts#L708)).

Recommandation : utiliser `auto` lorsque `prefers-reduced-motion: reduce`, sauf override explicite du consommateur.

### P3 — Les titres ne sont pas des headings par défaut

Le dialog est correctement nommé par `aria-labelledby`, mais `Header` ne crée pas un `h2`. La navigation par titres reste donc moins utile.

Recommandation : rendre un heading par défaut ou documenter clairement que le contenu du Header doit en fournir un.

### P3 — ESM-only et changelogs partagés doivent être explicites

Les exports publient uniquement une condition `import`. Le même changelog racine est copié lorsqu'un package n'a pas de changelog local.

Recommandation : documenter ESM-only comme contrat assumé. Préférer ensuite des changelogs par package si les changements commencent à diverger.

## Structure cible pragmatique

```text
packages/core
├── workflow/          # builder, définitions figées, contrats publics
├── runtime/           # contrôleur, état, transitions
├── presentation/dom/  # driver, géométrie, focus
├── adapter/           # bridge partagé et versionné
├── index.ts           # API consommateur commune
└── adapter.ts         # sous-export réservé aux adapters

packages/{react,vue,solid,angular,vanilla}
├── create-tour        # spécialisation du type de contenu
├── primitives         # composants natifs nommés
├── default-tour       # composition simple prête à l'emploi
├── state              # hook/injection native
└── index              # surface commune + conventions du framework

packages/styles
└── default.css        # thème optionnel complet et scoped
```

Il n'est pas nécessaire de créer un huitième package. Un sous-export `core/adapter` suffit.

## Roadmap recommandée

### Étape 0 — Débloquer les gates (OK)

1. Corriger `.delay(0)` dans la fixture tarball.
2. Rejouer toute la chaîne CI avec accès npm.
3. Confirmer l'existence des sept packages sur npm ; sinon préparer le workflow d'amorçage temporaire.

### Étape 1 — Simplifier l'API pendant que les breaking changes sont libres

1. Supprimer les options inertes et les types legacy.
2. Introduire `DefaultTour` / `GlowTour.Default` dans chaque adapter.
3. Émettre une erreur de développement pour un root sans présentation.
4. Extraire et partager `core/adapter`.
5. Définir la matrice de parité des adapters et normaliser les exports.

### Étape 2 — Rendre la flexibilité réelle

1. Autoriser tous les contrôles focalisables dans le popover.
2. Corriger la modalité pour les technologies d'assistance.
3. Clarifier SSR/hydratation et les responsabilités des options ARIA.

### Étape 3 — Finir la DX et le thème

1. Corriger et scinder les READMEs par package.
2. Compléter le style Cancel et le reflow vertical.
3. Simplifier Vanilla et séparer entrée pure/auto.
4. Vérifier le tree-shaking et les tailles bundle.

### Étape 4 - Tests avancés

1. Ajouter le smoke Playwright cross-framework. 


## Critères de sortie « production ready »

- Tous les gates CI passent, y compris installation et typecheck des tarballs.
- Un quick start fonctionnel tient en une factory, une composition par défaut et un workflow.
- Toute option publique est utilisée et testée.
- Les cinq adapters satisfont le même contrat de capacités.
- Un scénario Playwright réel passe au minimum sous Chromium et WebKit.
- Le contenu riche reste utilisable au clavier.
- La modalité et l'annonce des étapes sont vérifiées avec les technologies d'assistance ciblées.
- Chaque tarball contient une documentation adaptée et des snippets compilés.
- Le processus de première publication puis de Trusted Publishing est exécutable uniquement depuis GitHub Actions.

## Limites de cette revue

- Audit statique des sources, manifests, scripts, tests et artefacts générés.
- Exécution locale des checks listés plus haut ; aucun test manuel dans un vrai navigateur ou lecteur d'écran.
- L'existence actuelle des packages `@glowhop/*-tour` sur npm n'a pas pu être confirmée de façon fiable.
- La revue spécialisée correctness a atteint sa limite d'exécution ; ses zones principales ont néanmoins été couvertes par la revue locale, les 236 tests du core/adapters et les audits architecture, accessibilité, testing et release.

