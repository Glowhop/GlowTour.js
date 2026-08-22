# Audit technique et recommandations

Date de l'audit : 13 août 2026  
Statut du projet : développement  
Périmètre : architecture, API publique, store, builder, adaptateurs, accessibilité, performance, tests et publication npm.

## Synthèse

La direction générale est cohérente : un moteur DOM partagé, des adaptateurs natifs React, Vue, Angular et Vanilla, un builder fluent et `@glowhop/observables` pour les états dynamiques.

Le projet n'est toutefois pas encore prêt pour une publication de production. Les principaux risques sont :

1. les packages npm exportent les sources TypeScript au lieu d'artefacts compilés ;
2. aucune GitHub Action de publication n'existe ;
3. les transitions du tour ne sont pas sérialisées ;
4. le store mélange état, navigation, DOM, focus, clavier, animations et positionnement ;
5. l'API laisse penser que plusieurs instances sont supportées alors que le DOM est global ;
6. le positionnement effectue du travail permanent et `destroy()` laisse subsister un intervalle ;
7. les raccourcis clavier peuvent agir pendant la saisie dans un champ ;
8. les tests couvrent peu les comportements réels du store et des adaptateurs.

## P0 — Bloquants avant publication

### P0.1 — Les packages npm exportent les sources TypeScript

Les manifests de `core`, React, Vue, Angular et Vanilla pointent directement vers `src/*.ts` ou `src/*.tsx` :

- `packages/core/package.json` ;
- `packages/react/package.json` ;
- `packages/vue/package.json` ;
- `packages/angular/package.json` ;
- `packages/vanilla/package.json`.

Cela fonctionne dans le workspace Bun/Vite, mais oblige les consommateurs à transpiler les sources de la bibliothèque. Angular nécessite en plus une distribution conforme à l'Angular Package Format.

#### Recommandations

- Produire du JavaScript ESM dans `dist`.
- Générer les déclarations `.d.ts`.
- Définir des exports conditionnels `types` et `import`.
- Ajouter un champ `files` explicite à chaque package.
- Construire Angular avec le tooling Angular adapté.
- Tester chaque tarball dans un projet consommateur vierge.

### P0.2 — Aucun workflow de publication GitHub Actions

Le dépôt ne contient pas de dossier `.github/workflows`. Le `package.json` racine ne propose aucun script de build, pack ou publication.

#### Recommandations

- Ajouter une CI exécutant lint, typecheck, tests, builds et smoke tests des tarballs.
- Publier uniquement depuis GitHub Actions.
- Utiliser une publication par tag ou release GitHub.
- Utiliser npm provenance et des permissions minimales.
- Publier dans l'ordre `core`, `styles`, puis adaptateurs.
- Ajouter une politique de versioning et un changelog.

### P0.5 — Contrats de dépendances framework incorrects

React, Vue et Angular sont déclarés comme dépendances runtime des adaptateurs. Cela peut installer plusieurs copies d'un framework chez le consommateur.

Le package React déclare React `^18.3.1`, tandis que la version installée de `@glowhop/react-observables` attend React 19 comme peer dependency. `@types/react` est également placé dans les dépendances runtime.

#### Recommandations

- Déplacer React, Vue, `@angular/core` et `@angular/common` dans `peerDependencies`.
- Les conserver dans `devDependencies` pour le développement local.
- Déplacer `@types/react` dans `devDependencies`.
- Décider explicitement si l'adaptateur supporte React 18, React 19 ou les deux.

## P1 — Risques importants de comportement

### P1.1 — Les transitions asynchrones ne sont pas sérialisées

`start()`, `next()`, `back()` et `goTo()` peuvent être appelées simultanément. Un double clic, un raccourci clavier ou une action automatique peut démarrer plusieurs résolutions de cible et animations concurrentes.

Conséquences possibles :

- étape finale différente de l'intention utilisateur ;
- animations qui se terminent dans le désordre ;
- listeners attachés à une ancienne étape ;
- callbacks exécutés plusieurs fois ;
- un ancien resolver async peut écraser un état plus récent.

#### Recommandations

- N'autoriser qu'une transition active à la fois.
- Introduire un token d'opération ou un `AbortController`.
- Ignorer toute réponse appartenant à une opération devenue obsolète.
- Désactiver `advance`, `previous` et `goToStep` pendant une transition.
- Tester les doubles clics, raccourcis répétés et changements de workflow en cours de résolution.

### P1.2 — Le store possède trop de responsabilités

`TourStore` gère actuellement :

- les observables et snapshots ;
- le workflow actif ;
- la navigation ;
- les callbacks et actions ;
- la résolution des cibles ;
- le scroll ;
- les raccourcis clavier ;
- le focus ;
- l'enregistrement des éléments DOM ;
- les animations ;
- le positionnement continu.

Cette concentration rend les tests coûteux et augmente le risque qu'une modification visuelle casse la machine d'état.

#### Structure recommandée

```text
TourController
  état, navigation, callbacks, actions, concurrence
        │
        ▼
TourViewDriver
  cible, éléments DOM, focus, scroll, overlay, popover, pointer
```

Les deux parties peuvent rester dans `@glowhop/core-tour`. Il n'est pas nécessaire de créer un package supplémentaire.

### P1.3 — Une définition de workflow contient du runtime mutable

`WorkflowDefinition.steps` contient des instances de `WorkflowStep`. Une step possède déjà un élément DOM résolu, des tableaux mutables, des callbacks et un observable de props.

Le builder clone ces instances à `finish()`, puis le store les clone de nouveau au démarrage.

#### Recommandations

- Faire retourner au builder une définition readonly et sans état runtime.
- Créer des `ActiveStep` internes lors de `run()`.
- Réserver aux `ActiveStep` les éléments résolus, observables et états temporaires.
- Résoudre les options par défaut à un seul endroit.

### P1.4 — La multi-instance est exposée mais pas réellement supportée

`createTourStore()` est public, mais chaque adaptateur utilise un singleton de module. Le store ne possède qu'un overlay, un popover et un pointer. Les triggers sont recherchés globalement avec `document.querySelector` et le clavier est écouté sur `window`.

Deux tours peuvent donc manipuler les mêmes éléments et IDs.

#### Recommandation privilégiée

Supporter de vraies instances avec :

```ts
const tour = createGlowTour<MyContent>();
```

Conserver en parallèle `glowTour` comme singleton par défaut.

Les composants doivent recevoir leur instance via :

- React Context ;
- Vue provide/inject ;
- Angular DI ;
- un root enregistré pour Vanilla.

Alternative plus petite pour la v1 : annoncer explicitement un fonctionnement singleton-only et ne plus exporter la factory de store.

### P1.5 — Boucle de positionnement permanente

Lorsque l'étape est affichée, une boucle `requestAnimationFrame` résout la cible, lit son rectangle et met à jour l'overlay à chaque frame. Un resolver async fourni par l'utilisateur peut donc être appelé environ 60 fois par seconde.

Un intervalle de 500 ms repositionne également le popover, ce qui duplique une partie du travail et peut créer des appels async simultanés.

#### Recommandations

- Observer les dimensions de la cible et du popover avec `ResizeObserver`.
- Écouter `scroll` et `resize`.
- Regrouper les événements dans un seul `requestAnimationFrame`.
- Comparer le rectangle courant au précédent avant toute écriture DOM.
- Prévoir un mode de suivi continu uniquement pour les cibles animées par transform.

### P1.6 — `destroy()` ne nettoie pas tout

`destroy()` nettoie les listeners généraux et la boucle de positionnement, mais pas `popoverListenerCleanups`. L'intervalle de 500 ms peut continuer après destruction et conserver des références vers le store et le DOM.

#### Recommandations

- Centraliser tous les nettoyages dans une seule collection.
- Renommer `destroy()` en `dispose()`.
- Rendre l'opération idempotente.
- Ajouter un test avec fake timers confirmant qu'aucun resolver n'est rappelé après `dispose()`.

### P1.7 — Les raccourcis clavier peuvent agir pendant la saisie

Le listener global compare uniquement `event.key`. `Enter`, `Backspace`, `ArrowLeft` ou `ArrowRight` peuvent donc naviguer dans le tour alors que l'utilisateur saisit du texte.

Le traitement ne vérifie pas non plus :

- `event.defaultPrevented` ;
- `event.isComposing` ;
- Ctrl, Meta ou Alt ;
- les inputs, textareas et éléments `contenteditable` ;
- les flags `disableNextButton` et `disableBackButton`.

#### Recommandations

- Ignorer les événements déjà traités, composés ou modifiés.
- Ignorer les raccourcis de navigation depuis un élément éditable ; décider séparément du comportement d'Escape.
- Utiliser la même règle d'autorisation pour le clavier et les boutons.
- Chercher les triggers dans le popover de l'instance, pas dans tout le document.

### P1.8 — Les callbacks de transition ne sont pas awaités

Les actions `onNext`, `onBack` et `onCancel` ont un type synchrone et leur retour n'est pas attendu. Une opération asynchrone lancée dans ces callbacks peut continuer après le changement d'étape.

#### Recommandations

- Accepter `void | Promise<void>`.
- Attendre le callback avant de commencer la transition.
- Définir une stratégie d'erreur cohérente : passage à `error`, annulation de la transition ou callback global.

## P1 — Accessibilité

### P1.9 — IDs ARIA identiques pour toutes les instances

React, Vue, Angular et Vanilla utilisent les mêmes IDs statiques pour le popover, le titre et la description.

Avec plusieurs roots montés, `aria-labelledby` ou `aria-describedby` peut cibler le contenu d'un autre tour.

#### Recommandations

- Générer un préfixe unique par instance.
- Le propager via le contexte de l'adaptateur.
- Scoper les recherches de triggers au root actif.

### P1.10 — Comportement modal sans sémantique modale

`FocusGuard` empêche le focus de sortir du popover lorsque l'interaction avec la cible est interdite, mais les wrappers exposent seulement `role="dialog"` sans `aria-modal`.

#### Recommandations

- Ajouter `aria-modal="true"` lorsque `allowInteraction` est faux.
- Ne pas l'ajouter lorsque la cible reste interactive.
- Documenter les deux modes : tour modal et interaction guidée non modale.

### P1.11 — Le focus guard n'est pas une vraie boucle Tab

Le guard redirige principalement vers les triggers Next/Back ou vers le popover. Il ne boucle pas entre le premier et le dernier élément focusable du contenu personnalisé.

#### Recommandations

- Intercepter Tab et Shift+Tab lorsque le tour est modal.
- Boucler entre les vrais éléments focusables du popover.
- Conserver le choix directionnel Next/Back seulement pour le focus initial d'une nouvelle étape.

## P2 — Cohérence de l'API publique

### P2.1 — Vocabulaire de statut incohérent

Dans l'implémentation actuelle :

- `running` correspond au déplacement et aux animations ;
- `idle` correspond à une étape visible et interactive ;
- `paused` est exposé mais jamais utilisé ;
- `not-started` et `idle` se recouvrent comme états initiaux possibles.

#### Proposition

```ts
type TourStatus =
  | "idle"
  | "starting"
  | "transitioning"
  | "active"
  | "paused"
  | "finished"
  | "cancelled"
  | "error";
```

Supprimer `paused` jusqu'à son implémentation est également une option plus simple.

### P2.2 — `canGoNext` est vrai sur la dernière étape

Cette valeur est techniquement cohérente avec `next()` qui termine le tour, mais son nom laisse penser qu'une étape suivante existe.

#### Proposition

- `next()` devient `advance()` ;
- `canGoNext` devient `canAdvance` ;
- la dernière avance termine le tour.

### P2.3 — Naming proposé pour le controller/store

| Nom actuel | Nom recommandé | Motif |
| --- | --- | --- |
| `TourStore` | `TourController` | Il orchestre des actions et le DOM |
| `createTourStore()` | `createGlowTour()` | Crée une instance complète |
| `snapshot` | `state` | Observable public de l'état |
| `get()` | `getState()` | Intention explicite |
| `subscribe()` | `subscribeState()` | Évite l'ambiguïté |
| `start()` | `run()` | Cohérent avec `glowTour.run()` |
| `next()` | `advance()` | Peut aussi terminer le tour |
| `back()` | `previous()` | Plus précis que « back » |
| `goTo()` | `goToStep()` | L'index représente une étape |
| `alterCurrentStep()` | `updateCurrentStep()` | Vocabulaire standard |
| `destroy()` | `dispose()` | Décrit le nettoyage d'une instance |
| `registerElementPopover()` | `setPopoverElement()` | Accepte aussi `null` |
| les trois `registerElement*()` | `attachView()` interne | Cache les détails DOM |

API cible possible :

```ts
const tour = createGlowTour<ReactNode>();

tour.state.get();
tour.state.subscribe(listener);

await tour.run(workflow);
await tour.advance();
await tour.previous();
await tour.goToStep(2);
await tour.cancel();

tour.updateCurrentStep((props) => ({
  ...props,
  title: "Updated",
}));

tour.dispose();
```

### P2.4 — Naming proposé pour le builder

| Nom actuel | Nom recommandé |
| --- | --- |
| `finish()` | `build()` |
| `wait(ms)` | `delay(ms)` |
| `action()` | `do()` |
| `exec()` | supprimer au profit de `do()` |
| `alter()` | supprimer au profit de `do()` |
| `onEvent()` et `on()` | garder uniquement `on()` |
| `onNext()` | `beforeAdvance()` |
| `onBack()` | `beforePrevious()` |
| `onCancel()` | `beforeCancel()` |

### P2.5 — `waitFor` et `waitForElement` n'attendent pas

Ces méthodes exécutent leur prédicat une seule fois. Un résultat `false` arrête seulement la suite des actions.

#### Recommandation privilégiée

Implémenter une vraie attente avec timeout et conserver les noms `waitFor` et `waitForElement`.

Alternative : renommer le comportement actuel en `continueIf` et `continueIfElementExists`.

### P2.6 — API publique trop large

Les adaptateurs réexportent tout le core via `export *`. Des classes et helpers internes deviennent ainsi des contrats publics accidentels.

#### Recommandations

- Définir des exports publics explicites.
- Ne pas exposer les classes DOM internes.
- Séparer les types publics des types runtime.
- Réserver des sous-paths uniquement lorsqu'ils apportent une utilité consommateur réelle.

## P2 — Incohérences entre adaptateurs

### P2.7 — `Root` ne possède pas le même rôle selon le framework

React retourne seulement ses enfants. Vue, Angular et Vanilla créent un véritable élément root avec un attribut `data-glow-tour-root`.

Le root doit avoir une responsabilité commune : scope d'instance, contexte, IDs et lookup DOM. Son rendu HTML peut rester framework-native.

### P2.8 — Angular expose moins d'overrides

Angular hardcode les IDs et relations ARIA dans les templates, alors que React et Vue permettent certains overrides.

Créer une matrice de parité documentant pour chaque adaptateur :

- root et instance ;
- IDs ;
- labels ;
- composants disponibles ;
- props d'accessibilité ;
- contenu dynamique ;
- montage et démontage.

### P2.9 — Le label accessible Vanilla devient obsolète

Le bouton Vanilla généré définit son `aria-label` une seule fois. Quand le texte visible passe de « Next step » à « Finish tour », le lecteur d'écran peut encore annoncer « Next step ».

Conserver la distinction entre un label fourni par le consommateur et un label généré, puis mettre à jour ce dernier à chaque changement d'étape.

### P2.10 — `cancelLabel` existe sans `CancelTrigger`

`PopoverOptions.buttons.cancelLabel` est public, mais aucun adaptateur ne fournit un composant ou web component Cancel.

Deux choix cohérents :

- ajouter `CancelTrigger` dans tous les adaptateurs ;
- supprimer `cancelLabel` et documenter que le consommateur doit créer son bouton.

## P2 — Documentation et spécification

### P2.11 — `project.md` contredit l'implémentation

Incohérences relevées :

- la documentation limite `target` à un query selector, tandis que le type accepte une string, un élément ou un resolver sync/async ;
- elle emploie `previous`, tandis que le code emploie `back` ;
- elle décrit des web components auto-montés, tandis que les adaptateurs utilisent des composants natifs montés par l'application ;
- la liste des statuts ne contient pas `not-started` ;
- la documentation parle de `previousLabel`, le code de `backLabel`.

Transformer `project.md` en contrat courant plutôt qu'en journal historique.

### P2.12 — `todo.md` contient une tâche déjà réalisée

Le support d'un événement ou d'une liste d'événements est indiqué comme restant à faire, alors que les overloads et l'implémentation sont présents.

Mettre à jour la liste afin qu'elle reste exploitable comme backlog.

## P2 — Tests manquants

Les tests actuels vérifient principalement les exports, des templates et des fragments de sources. Il manque des tests directs pour :

- `run → active → advance → finished` ;
- `previous` depuis la première étape ;
- callbacks appelés exactement une fois ;
- erreurs et exceptions des callbacks ;
- cibles sync, async et sélecteurs ;
- stratégies `error`, `skip` et `wait` ;
- transitions simultanées ;
- suppression des listeners, intervals et rAF ;
- raccourcis dans input, textarea, contenteditable et pendant une composition IME ;
- montage, remplacement et démontage des éléments ;
- changement dynamique des props ;
- parité montée React, Vue, Angular et Vanilla ;
- deux instances simultanées ;
- installation/import des tarballs npm.

Créer une suite d'acceptation commune à deux étapes exécutée par chaque adaptateur.

## P3 — Simplifications et dette faible

### P3.1 — Doublons dans le builder

`action`, `alter` et `exec` expriment presque la même intention. `on` et `onEvent` sont également des alias complets.

Garder une seule primitive par comportement réduit la documentation et le nombre de décisions utilisateur sans réduire la flexibilité.

### P3.2 — Code d'animation et géométrie dupliqué

`packages/core/src/utils/animations.ts` semble inutilisé et possède sa propre implémentation de la géométrie de l'overlay, alors que `utils.ts` contient également `roundedRectPath`.

Confirmer l'absence d'import public, puis supprimer le fichier ou conserver une seule implémentation.

### P3.3 — Types publics apparemment abandonnés

`HighlightOptions`, `HighlightStepOverrides` et `WorkflowHighlightOptions` ne semblent pas participer au flux actuel basé sur `OverlayOptions`.

Les retirer des exports publics s'ils ne correspondent pas à une fonctionnalité planifiée et documentée.

### P3.4 — Factories d'adaptateurs répétées

Les quatre fichiers `glow-tour.ts` créent presque le même singleton en ne changeant que le type de contenu.

Une factory centrale `createGlowTour<TContent>()` peut supprimer cette duplication sans chercher à mutualiser les composants des frameworks.

### P3.5 — Métadonnées package absentes

Ajouter avant publication :

- README ;
- LICENSE ;
- CHANGELOG ;
- description ;
- repository, homepage et bugs ;
- keywords ;
- engines ;
- politique de support des frameworks ;
- décision `sideEffects` par package.

Le package Vanilla a un effet de bord volontaire lors de l'enregistrement automatique des custom elements. Il ne faut donc pas appliquer `sideEffects: false` indistinctement à tous les packages.

## Matrice finale de résolution

La branche indiquée est celle qui porte la correction de la recommandation, selon la chaîne de
branches empilées. Les tests P2 couvrent la suite d'acceptation commune et les contrats d'installation.

| Recommandations | Branche | Preuve concise |
| --- | --- | --- |
| P0.1, P0.2, P0.5 | `codex/audit-p0-release` | Distributions ESM/APF, manifests publiés, CI/release OIDC, peer dependencies et smoke tarballs. |
| P1.1–P1.11 | `codex/audit-p1-runtime` | Controller/runtime séparés, transitions annulables, DOM driver, focus/clavier, IDs et cleanup isolés. |
| P2.1–P2.6 | `codex/audit-p2-contracts` | Statuts et capacités canoniques, `createGlowTour`, builder public, attentes bornées et exports explicites. |
| P2.7–P2.10 | `codex/audit-p1-runtime` | Roots et instances injectés par adaptateur, parité des contrôles, labels dynamiques et suppression de `cancelLabel`. |
| P2.11–P2.12 | `codex/audit-p2-contracts` | `project.md` décrit le contrat courant et `todo.md` ne conserve que le travail restant. |
| P2 — Tests manquants | `codex/audit-p2-contracts` | Suite d'acceptation commune montée dans React 19, Vue, Angular, Solid et Vanilla; smoke tests des tarballs. |
| P3.1 | `codex/audit-p2-contracts` | Les alias du builder ont été supprimés lors de la finalisation de son contrat canonique. |
| P3.2–P3.3 | `codex/audit-p3-polish` | Le module d'animation/géométrie mort et les anciens types Highlight ont été supprimés. |
| P3.4 | `codex/audit-p1-runtime` | Les adaptateurs délèguent à la factory Core tout en conservant leur spécialisation de contenu; aucun singleton public ne subsiste. |
| P3.5 | `codex/audit-p3-polish` | Licence, documentation, métadonnées npm et `sideEffects` propres à chaque package ont été ajoutés. |

## Points positifs à préserver

- Le moteur DOM partagé évite de réimplémenter le comportement dans chaque framework.
- Les adaptateurs utilisent des contenus natifs à leur framework.
- L'overlay et le pointer sont masqués de l'arbre d'accessibilité.
- Les actions par défaut utilisent de vrais boutons.
- Le focus initial dépend déjà de la direction.
- Le focus précédent est restauré à la fin du tour.
- Le thème contient des styles `focus-visible` et un traitement de `prefers-reduced-motion`.
- Le typecheck strict passe actuellement.
- Les abonnements Vue, Angular et Vanilla observés possèdent des cleanups de démontage.

## Architecture cible recommandée

```text
adapter factory ou singleton par défaut
        │
        ▼
builder fluent ──► WorkflowDefinition readonly
                         │ run()
                         ▼
                  TourController
          état / navigation / actions / concurrence
                         │
                  TourViewDriver interne
          cible / focus / overlay / positionnement
                         │
              DOM enregistré et scopé par instance
                         │
                         ▼
          composants natifs React / Vue / Angular / Vanilla
```

Organisation interne possible :

```text
packages/core/src/
  definition/
    builder.ts
    types.ts
    options.ts
  runtime/
    tour-controller.ts
    active-step.ts
    transition-coordinator.ts
  dom/
    tour-view-driver.ts
    element-registry.ts
    target-resolver.ts
    focus-guard.ts
    positioning.ts
    overlay.ts
    popover.ts
    pointer.ts
  index.ts
```

## Ordre d'exécution recommandé

1. Corriger la divergence CSS/test et le périmètre Biome.
2. Figer le vocabulaire public pendant que les breaking changes sont acceptées.
3. Rendre les exports publics explicites.
4. Séparer les définitions readonly des steps runtime.
5. Introduire `TourController` et `TourViewDriver`.
6. Sérialiser et rendre annulables les transitions.
7. Corriger le clavier, le focus modal, les IDs et tous les cleanups.
8. Remplacer le polling permanent par un positionnement piloté par événements.
9. Ajouter les tests comportementaux du core et la matrice d'acceptation cross-framework.
10. Construire les packages et corriger les peer dependencies.
11. Ajouter les smoke tests de tarballs.
12. Ajouter la documentation de consommation et les métadonnées npm.
13. Ajouter la GitHub Action de publication avec provenance.

## Vérifications effectuées pendant l'audit

| Commande | Résultat |
| --- | --- |
| `bun run typecheck` | Succès |
| `bun run --cwd apps/playground build` | Succès, avec avertissement de taille du chunk Angular |
| `bun test` | 53 succès, 1 échec CSS/test |
| `bun run check` | Échec : périmètre `.agents/skills` et diagnostics projet |

Ces résultats décrivent l'état du dépôt au 13 août 2026. Ils doivent être réévalués après chaque phase de correction.
