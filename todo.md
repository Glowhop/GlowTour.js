# TODO — lacunes identifiées

Trois manques repérés lors d'un comparatif avec Driver.js / Shepherd / Intro.js / react-joyride.
Ce fichier sert à cadrer la solution avant implémentation, pas à décrire une API figée.

État actuel de référence :
- `packages/core/src/runtime/tour-controller.ts` — `createGlowTour`, `run(workflow, options)`, `state.subscribe`, hooks `onStart` / `onCancel` / `onFinish` (`StartOptions` dans `packages/core/src/types/index.ts:206`).
- `packages/core/src/config/` — `createWorkflowFromConfig`, validation JSON.
- `packages/styles/default.css` — thème clair unique, tokens `--glow-tour-*`.
- `apps/playground/multipage/` — reprise multi-page bricolée en `sessionStorage`, hors du core.

---

## 1. Reprise / multi-page / persistance d'état

**Problème.** Un tour ne survit ni à un rechargement complet, ni à une navigation SPA qui démonte le root, ni à une session utilisateur ("reprendre où j'en étais"). `run()` démarre toujours à l'étape 0 : pas de `startAt`. Le seul chemin existant est le pattern manuel de `apps/playground/multipage/shared.ts` (clé `sessionStorage`, index d'étape, ré-appel de `run`), qui est une démo, pas une API.

**Limite dure, à documenter avant d'écrire une ligne.** Les callbacks du builder (`do`, `waitUntil`, `beforeAdvance`, `target` en fonction, `eventHandlers`) ne sont pas sérialisables. Aucun snapshot ne peut reconstruire un workflow : il ne peut que **pointer vers** un workflow que l'app reconstruit côté client. La persistance porte sur *où on en était*, pas sur *ce qu'on exécutait*.

### Contrainte directrice

> `id` obligatoire sur chaque étape, `startAt` optionnel. Zéro impact **de comportement** pour qui ne fait pas de multi-page.

La reprise est un besoin **minoritaire**. Le core ne doit apprendre ni le mot "stockage", ni le mot "routeur" : ce sont des politiques d'app, et chaque app les veut différentes. Tout ce que le core apporte, c'est ce que personne ne peut greffer depuis l'extérieur — l'identité d'étape et le point d'entrée de `run()`.

`id` est rendu **obligatoire** : une identité optionnelle se paie partout ailleurs (branches `undefined` dans l'état, dans les événements du chantier 3, dans la doc qui doit expliquer deux modes). Une seule forme, toujours présente, toujours fiable. Le coût est réel et assumé : c'est un mot de plus par étape pour tout le monde, y compris ceux qui ne reprendront jamais un tour, et c'est un **breaking change** sur le builder et sur le format de config JSON.

Critère de non-régression, à vérifier explicitement : **une fois les `id` ajoutés, un utilisateur qui n'écrit pas `startAt` ne voit aucune différence de comportement** — même rendu, même séquence, aucune option de persistance à comprendre dans la doc de démarrage, aucun octet de code de stockage exécuté ou embarqué.

### Périmètre retenu

#### 1.1 — `id` obligatoire sur l'étape

- [ ] `id: string` (requis) sur `WorkflowStepDefinition` (`packages/core/src/definition/types.ts`), le builder et le config JSON (`packages/core/src/config/types.ts` + `validate.ts`).
- [ ] Pas d'id généré, pas d'id positionnel de repli : le `${name}#${index}` est refusé, il donnerait une fausse impression de stabilité et casserait au premier réordonnancement. L'id est écrit par l'auteur du tour, ou le workflow ne se construit pas.
- [ ] Validation à la **construction** du workflow, pas au `run()` : id non vide, et unicité dans le workflow. Message d'erreur nommant l'étape fautive (index + titre) — c'est la première chose que verra tout utilisateur qui migre.
- [ ] `TourState.currentStep.id` est un `string`, jamais `undefined`. Le chantier 3 (événements) consomme la même identité : un seul concept pour les deux.
- [ ] Prévoir le coût de migration **dans le même lot** : builder, config JSON, `apps/playground/*`, `apps/website`, les exemples de `docs/`, les fixtures de test. Un `id` requis ajouté sans migrer les exemples rend toute la doc fausse d'un coup.
- [ ] Rédiger la note de migration (une ligne par surface touchée) pour le changeset — c'est le breaking change le plus visible de la lib à ce jour.

#### 1.2 — `startAt` optionnel dans `StartOptions`

- [ ] `startAt?: string` (id d'étape) sur `StartOptions` (`packages/core/src/types/index.ts:206`), résolu dans `TourController.run` avant l'initialisation de `this.index` (aujourd'hui figé à 0).
- [ ] Ne pas accepter d'index numérique : un index n'est pas stable, l'accepter encouragerait exactement le bug qu'on veut éviter. Une seule forme à documenter.
- [ ] Absent → chemin de code identique à aujourd'hui, au sens strict (mêmes tests existants verts sans modification).
- [ ] Id introuvable : **erreur explicite**. Avec un `id` requis et validé à la construction, ce cas ne peut plus venir que d'un `startAt` périmé (workflow modifié depuis la sauvegarde) — l'app doit le savoir, pas le subir. Pas de démarrage silencieux à l'étape 0 — un onboarding qui redémarre du début sans le dire est un bug vu par l'utilisateur final. À trancher : erreur dure, ou option `fallback: "start" | "throw"` (défaut `throw`). Préférer l'erreur dure tant qu'un besoin réel de `fallback` n'est pas apparu.
- [ ] `onStart` reçoit l'étape réellement entrée, pas `steps[0]` — corriger la doc de `LifecycleHookContext` (`packages/core/src/types/index.ts:180`) en conséquence.
- [ ] Le workflow reste entier : `startAt` positionne le curseur, il ne tronque rien. `previous()` peut remonter avant l'étape de reprise, `totalSteps` et l'indicateur `x/y` sont inchangés.
- [ ] Tests unitaires core, sans DOM.

### Hors périmètre — assumé, documenté en recette

Rien de ce qui suit n'entre dans le core tant qu'il n'est pas prouvé que plusieurs apps le réécrivent à l'identique. Ajouter plus tard est additif ; retirer est breaking.

- [ ] **Persistance** : pas de `TourStorage`, pas de `storage`, pas de `persist`, pas de TTL, pas de `snapshot()` / `resume()`. Avec 1.1 + 1.2, la recette tient en deux lignes côté app, et c'est l'app qui touche `sessionStorage` — donc le SSR reste intact par construction, sans qu'une seule ligne de garde `typeof window` entre dans le core :

  ```js
  tour.state.subscribe((s) => { if (s.currentStep?.id) sessionStorage.setItem(KEY, s.currentStep.id); });
  tour.run(workflow, { startAt: sessionStorage.getItem(KEY) ?? undefined });
  ```

- [ ] **Navigation multi-page** (`step.navigate` / `onNavigate`) : chantier distinct, pas de la persistance. Le core ne doit connaître ni Next router, ni vue-router, ni `location.assign`. À rouvrir seulement si la recette ci-dessus se révèle insuffisante en usage réel, et alors comme une *intention* déclarative exécutée par l'app.
- [ ] **`pause()` / `resume()` : écarté, décision prise.** Le besoin réel derrière "pause" — le tour attend une action de l'utilisateur — est déjà couvert par `waitUntil`, les `eventHandlers` et `beforeAdvance` : l'étape reste affichée et n'avance pas. Ajouter `pause()` serait une seconde façon de faire la même chose, donc une question à trancher à chaque étape. Le seul cas non couvert (figer puis reprendre à l'identique dans la même session) n'a aucune demande démontrée ; l'ajout resterait additif s'il s'en présentait une.
- [ ] **Cas limites à traiter dans la doc, pas dans le code** : cible disparue (= timeout de cible normal, chemin existant), workflow modifié depuis la sauvegarde, retour trois jours plus tard, deux onglets ouverts. Ce sont des arbitrages d'app ; les figer dans le core imposerait un choix à tout le monde.

### Vérification

- [ ] Core, sans DOM : `startAt` (id valide / introuvable / absent), rejet d'un id manquant ou dupliqué à la construction, `currentStep.id`.
- [ ] Non-régression : la suite existante passe une fois les `id` ajoutés aux fixtures, sans autre changement — le diff doit se limiter à l'ajout d'`id`, c'est la preuve du "zéro impact de comportement".
- [ ] SSR (`apps/ssr-*`) : rien à ajouter, et c'est le point — vérifier qu'aucun accès `window` n'est apparu dans le core.
- [ ] Playwright : reprise après reload dur via la recette, reprise SPA sans reload.
- [ ] Migrer `apps/playground/multipage/` sur `id` + `startAt` et supprimer l'index d'étape bricolé — la démo devient la preuve que deux options suffisent.
- [ ] `docs/` : une page "reprendre un tour" avec la recette complète et la limite de sérialisation énoncée en tête.

**Piège.** `TourController` a déjà un champ privé `snapshot` (l'état publié) : ne pas réutiliser ce nom si un jour une API publique de snapshot revient sur la table.

**Timing.** Bloquant pour le publish npm : `id` requis est un breaking change sur le builder **et** sur le format de config JSON. Le faire après la publication imposerait un major et une migration à des utilisateurs réels — le faire avant ne coûte que la mise à jour des exemples du repo.

---

## 2. Thème unique / dark mode / galerie visuelle

**Problème.** `packages/styles/default.css` ne fournit qu'un thème clair. Aucune règle `prefers-color-scheme`, aucun sélecteur `[data-theme]`. Les tokens `--glow-tour-*` existent déjà (couleurs, rayon, ombre, espacement, durée) — la base est là, il manque les valeurs sombres et une stratégie de bascule.

**À trancher.**
- [ ] **Mécanique de thème** : définir la palette claire sur `:root` (déjà le cas), redéfinir uniquement les tokens sous `@media (prefers-color-scheme: dark)` **et** sous un sélecteur explicite (`[data-glow-tour-theme="dark"]`), pour que l'app puisse forcer un thème indépendamment de l'OS. Les deux, pas l'un ou l'autre.
- [ ] **Où vit la bascule** : attribut posé par le core sur le root de tour, ou laissé entièrement à l'app ? Option la plus simple et la plus honnête : purement CSS, aucun code — à valider.
- [ ] **Vérifier l'overlay en sombre** : l'opacité du backdrop et l'ombre du popover ne se transposent pas mécaniquement ; à régler à l'œil dans un vrai navigateur, pas au jugé.
- [ ] **Contraste** : vérifier AA sur `--glow-tour-color-text` / `-text-muted` / `-on-accent` dans les deux thèmes. C'est cohérent avec le contrat de `docs/accessibility.md` — un thème sombre qui casse le contraste annulerait l'argument a11y.
- [ ] **Deuxième thème ?** décider si on livre seulement `default` (clair + sombre) ou un second thème d'exemple (minimal / bordé) pour prouver que les tokens suffisent à re-skinner sans forker le CSS.
- [ ] **Galerie visuelle** sur `apps/website` : une page par variation (placements, overlay, indicateur, thème clair/sombre, popover large/étroit, contenu long), chaque exemple exécutable et son code affiché. C'est le manque le plus visible face à Driver.js et Shepherd, dont la doc vend le rendu.
- [ ] Envisager des captures/GIF dans le README racine — aujourd'hui il n'y a **aucune** image d'une lib visuelle.

---

## 3. Hooks d'événements pour le monitoring

**Problème.** Il existe `onStart` / `onCancel` / `onFinish` par tour et `state.subscribe`, mais rien qui décrive proprement "quoi brancher sur une analytics". Pas d'événement par étape (entrée/sortie), pas de direction, pas de durée, pas d'erreur, pas de raison d'abandon. Recomposer ça depuis `subscribe` est possible mais chaque app le réécrit — et le fera différemment.

**À trancher.**
- [ ] **Liste d'événements à figer** (nommage stable, c'est un contrat public) : `tour:start`, `step:enter`, `step:leave`, `step:action-error`, `tour:complete`, `tour:cancel`, `tour:error`, éventuellement `tour:resume` (dépend du chantier 1).
- [ ] **Payload commun** : `{ workflowName, stepId, stepIndex, stepCount, direction, timestamp, durationMs }`. Décider si on expose la raison de sortie (clic bouton / raccourci clavier / clic overlay / API) — c'est précisément ce qu'on veut mesurer pour un onboarding, et le `tour-view-driver` connaît déjà la source de la commande.
- [ ] **Forme de l'API** : un `onEvent(event)` unique dans `StartOptions` + `GlowTourOptions` (simple, une seule chose à brancher), plutôt qu'une multiplication de `onXxx`. Vérifier la cohabitation avec les hooks existants — ne pas les dupliquer, ou les déprécier au profit du flux d'événements.
- [ ] **Sémantique stricte** : ces callbacks sont du monitoring, ils ne doivent **jamais** pouvoir bloquer ni annuler une transition (contrairement à `LifecycleHookContext.abort()`). Une exception jetée dans un listener ne doit pas casser le tour → try/catch + fail silencieux (ou remontée sur `tour:error`).
- [ ] **Coût** : rien ne doit être calculé quand aucun listener n'est branché.
- [ ] **Sérialisable ?** décider si le flux d'événements est exprimable depuis le config JSON (nom d'événement + destination), ou strictement côté JS. Cohérent avec `docs/json-config.md`.
- [ ] **Adapters** : exposer l'équivalent idiomatique (prop React, emit Vue, `Output` Angular, `CustomEvent` sur le custom element vanilla) sans réimplémenter la logique — le core reste la seule source.
- [ ] Documenter un exemple bout-en-bout (branchement sur une analytics quelconque) dans `docs/`.

---

## Ordre suggéré

1. **Reprise : `id` + `startAt`** — d'abord, parce que le chantier 3 consomme la même identité d'étape. L'inverse ferait naître les événements avec un `stepId` optionnel à durcir ensuite. C'est aussi le seul lot breaking (builder + format JSON), donc à passer tant que le projet est en statut `dev`.
2. **Événements de monitoring** — petit et purement additif une fois l'identité en place.
3. **Dark mode + galerie** — indépendant du reste, gros gain de perception pour un coût faible.

Périmètre revendicable une fois le lot 1 livré — à respecter dans le README et sur `apps/website` : ids d'étape stables, démarrage à une étape arbitraire, reprise après rechargement ou navigation en ~2 lignes avec le stockage et le routeur de l'app, compatible SSR. **Pas** "pause/reprise", **pas** "gère les workflows multi-pages" : ces deux formulations promettent des API qui n'existeront pas.
