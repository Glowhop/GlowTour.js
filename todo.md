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

### Périmètre retenu — livré

Branche `feature/step-id-start-at` : commits `8fddb54` (fonctionnalité) et `2bd51ef` (correctif d'animation découvert à la vérification).

#### 1.1 — `id` obligatoire sur l'étape

- [x] `id: string` (requis) sur `WorkflowStepDefinition` (`packages/core/src/definition/types.ts`), le builder et le config JSON (`packages/core/src/config/types.ts` + `validate.ts`).
- [x] Pas d'id généré, pas d'id positionnel de repli : le `${name}#${index}` est refusé, il donnerait une fausse impression de stabilité et casserait au premier réordonnancement. L'id est écrit par l'auteur du tour, ou le workflow ne se construit pas.
- [x] Validation à la **construction** du workflow, pas au `run()` : id non vide, et unicité dans le workflow. Message d'erreur nommant l'étape fautive (index + titre).
- [x] `TourState.currentStep.id` est un `string`, jamais `undefined`. Le chantier 3 (événements) consomme la même identité.
  - Ajout non prévu au plan : `id` est **exclu de `StepProps`** (`Omit<StepParameters, "id" | …>`), sinon l'identité serait mutable en cours de tour via `StepPropsStore`.
- [x] Migration dans le même lot : 265 sites d'appel (core, adapters, playground, scripts) + 106 exemples de doc, ids dérivés des sélecteurs.
- [x] Note de migration rédigée dans le changeset `.changeset/step-id-start-at.md`.

#### 1.2 — `startAt` optionnel

- [x] `startAt?: string` (id d'étape), résolu dans `TourController.run` avant l'initialisation de `this.index`.
  - **Écart avec le plan** : pas sur `StartOptions`, qui est figé dans la définition réutilisable du workflow — une position de reprise appartient à un appel, pas au workflow. D'où un nouveau `RunOptions` en second argument : `run(workflow, { startAt })`.
- [x] Pas d'index numérique accepté : une seule forme, stable, à documenter.
- [x] Absent → chemin de code identique à aujourd'hui.
- [x] Id introuvable → **erreur dure**. L'option `fallback` n'a pas été ajoutée, conformément à la recommandation : aucun besoin réel démontré.
- [x] `onStart` reçoit l'étape réellement entrée ; doc de `LifecycleHookContext` corrigée.
- [x] Le workflow reste entier : `previous()` remonte avant l'étape de reprise, `totalSteps` inchangé. Couvert par un test.
- [x] Tests unitaires core, sans DOM.

**Bug trouvé et corrigé pendant le lot.** La façade publique `createGlowTour` déclarait `run: (workflow) => controller.run(workflow)` et jetait donc silencieusement `startAt`. TypeScript accepte une signature plus étroite, et tous les tests pilotent `TourController` directement : types verts, tests verts, fonctionnalité inopérante pour tout consommateur réel (les cinq adapters passent par cette façade). Seule la vérification navigateur l'a révélé. Un test passant par l'entrée publique le couvre désormais — validé en le faisant échouer sur le code non corrigé.

**Bug préexistant trouvé et corrigé** (`2bd51ef`, hors périmètre initial). Un document masqué gèle sa timeline : `animation.finished` ne se résout jamais, `driver.show()` ne rend pas la main, le tour reste en `status: "transitioning"` avec `canAdvance` à `false`. Touche tout onglet en arrière-plan, page prérendue ou automatisation headless. `_waitForAnimation` termine désormais une animation qui ne peut pas progresser au lieu de l'attendre.

### Hors périmètre — assumé, documenté en recette

Rien de ce qui suit n'est entré dans le core. Ajouter plus tard est additif ; retirer est breaking.

- [x] **Persistance** : aucun `TourStorage`, `storage`, `persist`, TTL, `snapshot()` ni `resume()` livré. La recette de deux lignes est dans le guide "Resuming a tour" ; c'est l'app qui touche `sessionStorage`, donc le core reste sans garde `typeof window`.
- [x] **Navigation multi-page** (`step.navigate` / `onNavigate`) : non livré, chantier distinct. À rouvrir seulement si la recette se révèle insuffisante en usage réel.
- [x] **`pause()` / `resume()`** : écarté. `waitUntil`, les `eventHandlers` et `beforeAdvance` couvrent déjà le besoin ; ce serait une seconde façon de faire la même chose.
- [x] **Cas limites traités dans la doc, pas dans le code** : cible disparue, workflow modifié, retour tardif, deux onglets — section "Cases worth handling yourself" du guide.

### Vérification

- [x] Core, sans DOM : `startAt` (id valide / introuvable / absent), rejet d'un id manquant ou dupliqué à la construction, `currentStep.id`, `id` absent des props. 475 tests verts, `bun run check` et `tsc --noEmit` propres.
- [x] Non-régression : la suite existante passe, le diff sur les fixtures se limite à l'ajout d'`id`.
- [x] SSR : les trois harnais `apps/ssr-react`, `apps/ssr-solid`, `apps/ssr-vue` passent (6 tests Playwright). **Surface oubliée au premier passage** : ces apps sont hors du tsconfig racine, donc `tsc` ne les couvrait pas et leurs 6 `.step({` non migrés auraient cassé au runtime. Toute future contrainte sur le builder doit inclure ce grep.
- [x] Migrer `apps/playground/multipage/` sur `id` + `startAt` : fait, `page-b.ts` perd `goToStep()` et son préfixe d'étapes `skip` au profit d'un seul `run(workflow, { startAt })`.
- [x] `docs/` : guide "Resuming a tour" (limite de sérialisation en tête, recette, SPA vs reload, cas limites), + références `builder` / `tour` / `json-config`.
- [ ] **Reste à faire — automatiser la reprise multi-page en Playwright.** Les deux scénarios ont été vérifiés manuellement en navigateur (reprise après reload dur : `resumed: status=active step=reload-settings` ; SPA : `spa-dashboard` → `?view=profile` → `spa-profile`), mais aucun test automatisé ne les couvre. Rien ne garantit la non-régression aujourd'hui.

**Piège.** `TourController` a déjà un champ privé `snapshot` (l'état publié) : ne pas réutiliser ce nom si un jour une API publique de snapshot revient sur la table.

**Timing.** Livré avant le publish npm, comme prévu : `id` requis est un breaking change sur le builder **et** sur le format de config JSON, et le faire après la publication aurait imposé un major à de vrais utilisateurs.

---

## 2. Thème unique / dark mode / galerie visuelle

**Problème.** `packages/styles/default.css` ne fournit qu'un thème clair. Aucune règle `prefers-color-scheme`, aucun sélecteur `[data-theme]`. Les tokens `--glow-tour-*` existent déjà (couleurs, rayon, ombre, espacement, durée) — la base est là, il manque les valeurs sombres et une stratégie de bascule.

**À trancher.**
- [ ] **Mécanique de thème** : définir la palette claire sur `:root` (déjà le cas), redéfinir uniquement les tokens sous `@media (prefers-color-scheme: dark)` **et** sous un sélecteur explicite (`[data-glow-tour-theme="dark"]`), pour que l'app puisse forcer un thème indépendamment de l'OS. Les deux, pas l'un ou l'autre.
- [ ] **Où vit la bascule** : attribut posé par le core sur le root de tour, ou laissé entièrement à l'app ? Option la plus simple et la plus honnête : purement CSS, aucun code — à valider.
- [ ] **Vérifier l'overlay en sombre** : l'opacité du backdrop et l'ombre du popover ne se transposent pas mécaniquement ; à régler à l'œil dans un vrai navigateur, pas au jugé.
- [ ] **Galerie visuelle** sur `apps/website` : une page par variation (placements, overlay, indicateur, thème clair/sombre, popover large/étroit, contenu long), chaque exemple exécutable et son code affiché. C'est le manque le plus visible face à Driver.js et Shepherd, dont la doc vend le rendu.
- [ ] Envisager des captures/GIF dans le README racine — aujourd'hui il n'y a **aucune** image d'une lib visuelle.

---

## 3. Hooks d'événements pour le monitoring

**Problème.** Il existait `onStart` / `onCancel` / `onFinish` par tour et `state.subscribe`, mais rien qui décrive proprement « quoi brancher sur une analytics ». Pas d'événement par étape, pas de direction, pas de durée, pas de source d'abandon.

### Périmètre retenu — livré

Branche `feat/monitoring-events`, partie de `feature/step-id-start-at` : le payload est bâti sur `stepId`, qui n'existe pas sur `main`.

- [x] **Six événements**, nommage figé : `tour:start`, `step:enter`, `step:leave`, `tour:complete`, `tour:cancel`, `tour:error`.
  - **Écart avec le plan — `step:action-error` non livré.** Une action qui jette part déjà dans `handleFailure` et termine le tour : l'exposer aussi comme événement propre donnerait deux noms pour une seule occurrence. `tour:error` porte l'erreur *et* l'étape sur laquelle le tour est mort.
  - **Écart avec le plan — `tour:resume` non livré.** Une reprise est un tour qui démarre sur une autre étape, et `tour:start` porte déjà `stepId` / `stepIndex` de l'étape d'entrée. Un `stepIndex` non nul *est* la reprise, sans second nom d'événement.
- [x] **Payload commun et plat** : `{ type, workflowName, stepId, stepIndex, stepCount, direction, source, timestamp, durationMs, error }`.
  - `durationMs` suit une règle unique et documentable en une ligne : **il chronomètre ce que l'événement nomme**. `step:leave` → temps passé sur l'étape ; `tour:complete` / `tour:cancel` / `tour:error` → temps depuis `run()` ; `tour:start` et `step:enter`, qui sont des débuts, → `0`. Ça évite un champ optionnel ou une union discriminée pour un seul champ.
- [x] **Raison de sortie livrée**, sous le nom `source` : `"trigger"` (bouton), `"keyboard"`, `"overlay"`, `"api"` (tout appel du code consommateur, y compris `context.advance()` dans une action). C'est le champ le plus utile du lot — un abandon en `"overlay"` et un abandon en `"trigger"` ne racontent pas la même chose. A demandé de faire descendre la source depuis `tour-view-driver` : `TourViewCommands.advance/previous/cancel` prennent désormais un `source`, et les méthodes publiques `advance()` / `previous()` / `cancel()` gardent leur signature publique inchangée (le paramètre est interne, `"api"` par défaut).
- [x] **Forme de l'API** : un `onEvent` unique, sur `GlowTourOptions` (instance) **et** `StartOptions` (workflow). Les deux sont appelés, l'instance d'abord. Ce n'est pas une seconde façon de faire : l'un est le branchement global, l'autre un ajout ponctuel à un tour.
- [x] **Hooks existants non dupliqués et non dépréciés** : `onStart` / `onCancel` / `onFinish` peuvent `abort()`, `onEvent` ne peut pas. Ils ne font pas le même travail.
- [x] **Sémantique stricte** : appelé de façon synchrone, valeur de retour ignorée, ne peut ni bloquer ni annuler. Une exception part sur `onSubscriberError` (puis le reporter non géré) et **jamais** sur `tour:error` — sinon un listener bogué ferait échouer le tour qu'il observe.
- [x] **Coût nul sans listener** : chaque site d'émission sort avant de construire le payload et avant de lire l'horloge.
- [x] **Non sérialisable, décidé** : `onEvent` n'est pas une clé de config JSON. La liste blanche de `validate.ts` le rejette déjà. Un workflow construit depuis un config est couvert par le listener d'instance ; l'ajouter au config serait une seconde façon d'enregistrer le même listener.
- [x] **Adapters : rien à ajouter.** Les cinq passent leur `GlowTourOptions` au core sans le filtrer, donc `createGlowTour({ onEvent })` est déjà la forme idiomatique partout. Une prop React / un emit Vue / un `Output` Angular seraient une seconde façon de brancher la même chose.
- [x] `docs/` : guide « Monitoring a tour » (les six événements, le payload, `source`, les deux points d'écoute, les garanties de non-blocage, le cas de la reprise) + références `tour` et `builder`.

### Vérification

- [x] 13 tests core sans DOM : séquence complète d'un tour terminé, annulation, position/compte, direction, source, durées, `tour:error` nommant l'étape et portant l'erreur, absence de `step:leave` à l'erreur, ordre instance-puis-workflow, listener qui jette, absence totale d'émission sans listener, reprise via `startAt`.
- [x] 1 test navigateur (`core.browser.ts`) : le listener passé à `createGlowTour` reçoit bien les événements **et** la source remonte correctement d'un clic de bouton (`"trigger"`) et d'un raccourci clavier (`"keyboard"`). Même garde que celle exigée par le lot 1 : les tests sans DOM pilotent `TourController` directement, donc une façade qui oublierait de transmettre `onEvent` — ou un driver qui cesserait de reporter la source — resterait verte partout ailleurs.
  - Piège rencontré en écrivant ce test : une racine construite à la main doit porter `data-glow-tour-root`, sinon `ownsTrigger` ne reconnaît pas le clic comme étant le sien. Les adapters posent cet attribut ; le harnais de test ne le faisait pas.
- [x] **Défaut trouvé en relisant ma propre implémentation** : `step:leave` était émis avant la mise à jour de `this.direction`, donc un retour arrière rapportait `direction: "advance"` — la direction d'arrivée sur l'étape, pas celle qui la fait quitter. Corrigé, et le test correspondant validé en le faisant échouer sur le code non corrigé.
- [x] 488 tests verts, `bun run check`, `tsc --noEmit`, `bun run test:browser`, build du site.

---

## Ordre suggéré

1. ~~**Reprise : `id` + `startAt`**~~ — **livré** (`8fddb54`, `2bd51ef`). L'identité d'étape est en place, le chantier 2 peut la consommer directement.
2. ~~**Événements de monitoring**~~ — **livré** sur `feat/monitoring-events`, branchée sur le lot 1 dont elle consomme `currentStep.id`.
3. **Dark mode + galerie** — indépendant du reste, gros gain de perception pour un coût faible.

Périmètre revendicable une fois le lot 1 livré — à respecter dans le README et sur `apps/website` : ids d'étape stables, démarrage à une étape arbitraire, reprise après rechargement ou navigation en ~2 lignes avec le stockage et le routeur de l'app, compatible SSR. **Pas** "pause/reprise", **pas** "gère les workflows multi-pages" : ces deux formulations promettent des API qui n'existeront pas.
