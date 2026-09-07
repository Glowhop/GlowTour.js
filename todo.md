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

- [ ] `id: string` (requis) sur `WorkflowStepDefinition` (`packages/core/src/definition/types.ts`), le builder et le config JSON (`packages/core/src/config/types.ts` + `validate.ts`).
- [ ] Pas d'id généré, pas d'id positionnel de repli : le `${name}#${index}` est refusé, il donnerait une fausse impression de stabilité et casserait au premier réordonnancement. L'id est écrit par l'auteur du tour, ou le workflow ne se construit pas.
- [ ] Validation à la **construction** du workflow, pas au `run()` : id non vide, et unicité dans le workflow. Message d'erreur nommant l'étape fautive (index + titre).
- [ ] `TourState.currentStep.id` est un `string`, jamais `undefined`. Le chantier 3 (événements) consomme la même identité.
  - Ajout non prévu au plan : `id` est **exclu de `StepProps`** (`Omit<StepParameters, "id" | …>`), sinon l'identité serait mutable en cours de tour via `StepPropsStore`.
- [ ] Migration dans le même lot : 265 sites d'appel (core, adapters, playground, scripts) + 106 exemples de doc, ids dérivés des sélecteurs.
- [ ] Note de migration rédigée dans le changeset `.changeset/step-id-start-at.md`.

#### 1.2 — `startAt` optionnel

- [ ] `startAt?: string` (id d'étape), résolu dans `TourController.run` avant l'initialisation de `this.index`.
  - **Écart avec le plan** : pas sur `StartOptions`, qui est figé dans la définition réutilisable du workflow — une position de reprise appartient à un appel, pas au workflow. D'où un nouveau `RunOptions` en second argument : `run(workflow, { startAt })`.
- [ ] Pas d'index numérique accepté : une seule forme, stable, à documenter.
- [ ] Absent → chemin de code identique à aujourd'hui.
- [ ] Id introuvable → **erreur dure**. L'option `fallback` n'a pas été ajoutée, conformément à la recommandation : aucun besoin réel démontré.
- [ ] `onStart` reçoit l'étape réellement entrée ; doc de `LifecycleHookContext` corrigée.
- [ ] Le workflow reste entier : `previous()` remonte avant l'étape de reprise, `totalSteps` inchangé. Couvert par un test.
- [ ] Tests unitaires core, sans DOM.

**Bug trouvé et corrigé pendant le lot.** La façade publique `createGlowTour` déclarait `run: (workflow) => controller.run(workflow)` et jetait donc silencieusement `startAt`. TypeScript accepte une signature plus étroite, et tous les tests pilotent `TourController` directement : types verts, tests verts, fonctionnalité inopérante pour tout consommateur réel (les cinq adapters passent par cette façade). Seule la vérification navigateur l'a révélé. Un test passant par l'entrée publique le couvre désormais — validé en le faisant échouer sur le code non corrigé.

**Bug préexistant trouvé et corrigé** (`2bd51ef`, hors périmètre initial). Un document masqué gèle sa timeline : `animation.finished` ne se résout jamais, `driver.show()` ne rend pas la main, le tour reste en `status: "transitioning"` avec `canAdvance` à `false`. Touche tout onglet en arrière-plan, page prérendue ou automatisation headless. `_waitForAnimation` termine désormais une animation qui ne peut pas progresser au lieu de l'attendre.

### Hors périmètre — assumé, documenté en recette

Rien de ce qui suit n'est entré dans le core. Ajouter plus tard est additif ; retirer est breaking.

- [ ] **Persistance** : aucun `TourStorage`, `storage`, `persist`, TTL, `snapshot()` ni `resume()` livré. La recette de deux lignes est dans le guide "Resuming a tour" ; c'est l'app qui touche `sessionStorage`, donc le core reste sans garde `typeof window`.
- [ ] **Navigation multi-page** (`step.navigate` / `onNavigate`) : non livré, chantier distinct. À rouvrir seulement si la recette se révèle insuffisante en usage réel.
- [ ] **`pause()` / `resume()`** : écarté. `waitUntil`, les `eventHandlers` et `beforeAdvance` couvrent déjà le besoin ; ce serait une seconde façon de faire la même chose.
- [ ] **Cas limites traités dans la doc, pas dans le code** : cible disparue, workflow modifié, retour tardif, deux onglets — section "Cases worth handling yourself" du guide.

### Vérification

- [ ] Core, sans DOM : `startAt` (id valide / introuvable / absent), rejet d'un id manquant ou dupliqué à la construction, `currentStep.id`, `id` absent des props. 475 tests verts, `bun run check` et `tsc --noEmit` propres.
- [ ] Non-régression : la suite existante passe, le diff sur les fixtures se limite à l'ajout d'`id`.
- [ ] SSR : les trois harnais `apps/ssr-react`, `apps/ssr-solid`, `apps/ssr-vue` passent (6 tests Playwright). **Surface oubliée au premier passage** : ces apps sont hors du tsconfig racine, donc `tsc` ne les couvrait pas et leurs 6 `.step({` non migrés auraient cassé au runtime. Toute future contrainte sur le builder doit inclure ce grep.
- [ ] Migrer `apps/playground/multipage/` sur `id` + `startAt` : fait, `page-b.ts` perd `goToStep()` et son préfixe d'étapes `skip` au profit d'un seul `run(workflow, { startAt })`.
- [ ] `docs/` : guide "Resuming a tour" (limite de sérialisation en tête, recette, SPA vs reload, cas limites), + références `builder` / `tour` / `json-config`.
- [ ] **Reste à faire — automatiser la reprise multi-page en Playwright.** Les deux scénarios ont été vérifiés manuellement en navigateur (reprise après reload dur : `resumed: status=active step=reload-settings` ; SPA : `spa-dashboard` → `?view=profile` → `spa-profile`), mais aucun test automatisé ne les couvre. Rien ne garantit la non-régression aujourd'hui.

**Piège.** `TourController` a déjà un champ privé `snapshot` (l'état publié) : ne pas réutiliser ce nom si un jour une API publique de snapshot revient sur la table.

**Timing.** Livré avant le publish npm, comme prévu : `id` requis est un breaking change sur le builder **et** sur le format de config JSON, et le faire après la publication aurait imposé un major à de vrais utilisateurs.

---

## 2. Thème unique / dark mode / galerie visuelle

**Problème.** `packages/styles/default.css` ne fournissait qu'un thème clair. Aucune règle `prefers-color-scheme`, aucun sélecteur de bascule.

**Correction du constat initial.** Les tokens `--glow-tour-*` n'étaient **déclarés nulle part** : ils n'existaient que comme valeurs de repli de `var()`, répétées à chaque usage. Le « palette claire sur `:root`, déjà le cas » de la version précédente de cette note était faux. Déclarer la palette était donc un prérequis, pas un acquis — et c'est le seul changement du lot qui pouvait régresser des surcharges existantes.

### Périmètre retenu — livré

Branche `feat/dark-mode-theme` : `19fb659` (palette), `7fa3c3d` (portée de l'attribut), `13182f2` (galerie).

#### 2.1 — Mécanique de thème

- [x] Palette claire déclarée, valeurs identiques aux anciens replis : aucun changement visuel.
- [x] Palette sombre sous `@media (prefers-color-scheme: dark)` **et** sous `[data-glow-tour-theme="dark"]`, les deux comme prévu. `"light"` force le clair sur un OS sombre.
- [x] **Où déclarer les tokens — la vraie décision du lot.** Sur `:where(:root)`, à spécificité 0. Deux recettes de surcharge sont documentées et incompatibles avec les autres emplacements : `packages/styles/README.md` documente la surcharge depuis un **ancêtre**, que déclarer sur `[data-glow-tour-root]` aurait cassée (l'élément le plus proche gagne) ; le guide de theming documente la surcharge sur `:where([data-glow-tour-root])`, que déclarer sur un `:root` nu aurait cassée (spécificité 0,1,0 contre 0). À spécificité 0 sur la racine, les deux survivent — vérifié en navigateur, pas déduit.
- [x] **Où vit la bascule** : purement CSS, zéro code core, conformément à l'option « la plus honnête ». Aucun global navigateur ajouté, SSR intact par construction.
  - **Écart avec le plan** : l'attribut devait être lu sur `:root` **et** sur le tour root. Il est lu sur **n'importe quel élément**. Deux raisons découvertes à l'implémentation : `Root` n'accepte pas de `data-*` en TypeScript (`RootProps` dérive de `HTMLAttributes`, qui n'a pas d'index signature pour `data-*`), donc l'attribut ne peut pas être posé sur le tour root depuis React ; et la galerie a besoin de thémer un **conteneur** pour poser une démo sombre sur une page claire. Lire l'attribut partout couvre les trois emplacements et fait passer le CSS de cinq blocs à trois.
- [x] `light-dark()` écarté, et la raison écrite dans le CSS et dans la doc : la fonction se résout sur `color-scheme`, propriété que la page hôte possède et que la plupart des apps ne définissent jamais — un `color-scheme` absent rend la valeur **claire** même sur un OS sombre (confirmé par MDN : « retourne la première valeur … si aucune préférence n'est définie »). S'y fier aurait aussi relevé le plancher navigateur (Baseline mai 2024) sans que ce plancher soit écrit nulle part. La fonction est en revanche recommandée dans la doc **au consommateur**, qui contrôle son propre `:root`.
- [x] Matrice de 8 états vérifiée en navigateur : OS clair/sombre × aucun attribut / `<html>` clair / `<html>` sombre / wrapper sombre / wrapper clair sous `<html>` sombre, plus la non-régression de la surcharge par ancêtre dans les deux thèmes.

#### 2.2 — Overlay et élévation en sombre

- [x] **Contrainte dure trouvée à la lecture du core** : l'opacité du voile est écrite **inline à chaque frame** par `overlay.ts` (`opacity != null ? … : 0.7`), donc inatteignable depuis CSS. Seul le `fill` l'est — `getRenderedTargetStyles` lit justement la valeur calculée quand `step.overlay.color` est absent. Nouveau token `--glow-tour-overlay-color`, et **aucun** token d'opacité : `step.overlay.opacity` existe déjà, ce serait une seconde façon de faire.
- [x] Le voile garde un noir identique dans les deux thèmes : il assombrit la page, il ne la teinte pas.
- [x] L'élévation passe de l'ombre à la bordure en sombre — une ombre sur fond sombre est invisible quelle que soit son opacité.
- [x] Vérifié à l'œil en navigateur, comme exigé : popover sombre sur page claire, voile et découpe corrects.

#### 2.3 — Galerie

- [x] **Constat initial à corriger là aussi** : la galerie existait déjà (9 exemples exécutables avec code affiché). Le manque n'était pas « construire une galerie » mais l'absence de page dédiée et de variation de thème.
- [x] Deux exemples ajoutés : *Light and dark* (commutateur `system` / `light` / `dark` posant l'attribut sur le wrapper de la démo, donc une seule démo bascule sur une page claire) et *Long content* (étape longue dans un popover de 260px, largeur venant d'une surcharge de token sur ce même wrapper).
- [x] Page dédiée `/examples` + entrée de nav ; la home garde la même galerie.
- [x] `lib/examples.ts` : démos et extraits de code étaient deux tableaux tenus dans le même ordre à la main — le premier réordonnancement associait le mauvais extrait à une démo. Fusionnés en une seule liste, réutilisée par les deux pages.
- [x] Piège rencontré : la première version de *Long content* ne défilait pas sur une fenêtre de 720px, alors que sa description l'affirmait. Contenu allongé jusqu'à ce que le défilement soit réel (contenu 819px dans une boîte de 576px, popover plafonné à 688px, en-tête et pied toujours visibles).

### Hors périmètre — assumé

- [x] **Contraste** : explicitement sorti du périmètre sur décision — c'est au dev intégrateur de vérifier. Conséquence actée : `docs/accessibility.md` revendique un audit AA sur le thème clair ; la doc de theming dit maintenant que les palettes sont un défaut raisonnable et non certifié, pour ne pas étendre implicitement cette revendication au sombre.
- [x] **Second thème d'exemple** : non livré. Une recette de dix lignes dans le guide prouve la même chose sans surface publique à maintenir.

### Vérification

- [x] `bun run check`, `bunx tsc --noEmit`, `bun test` (459 tests) verts ; build du site OK.
- [x] Navigateur : matrice de thèmes, galerie, page `/examples`, aucune erreur console.
- [x] **Piège d'outillage à retenir.** Les trois boutons ont `transition: background-color`. Dans un document masqué, la timeline est gelée : `getComputedStyle` renvoie indéfiniment la couleur de **départ**, ce qui donne l'illusion d'un thème qui ne s'applique pas aux boutons alors que le popover, lui, change. Même classe de problème que `2bd51ef` du lot 1. Toute vérification de thème par styles calculés doit neutraliser les transitions d'abord.
- [ ] **Reste à faire — captures / GIF dans le README racine.** Toujours aucune image d'une lib visuelle. À enregistrer via Playwright plutôt qu'à la main, sinon la capture périme au premier changement de style.

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

1. ~~**Reprise : `id` + `startAt`**~~ — **livré** (`8fddb54`, `2bd51ef`). L'identité d'étape est en place, le chantier 2 peut la consommer directement.
2. ~~**Dark mode + galerie**~~ — **livré** (`19fb659`, `7fa3c3d`, `13182f2`), pris avant le lot 3 car indépendant. Reste les captures du README.
3. **Événements de monitoring** — prochain. Petit et purement additif une fois le lot 1 mergé, `currentStep.id` étant garanti non nul.

Périmètre revendicable une fois le lot 1 livré — à respecter dans le README et sur `apps/website` : ids d'étape stables, démarrage à une étape arbitraire, reprise après rechargement ou navigation en ~2 lignes avec le stockage et le routeur de l'app, compatible SSR. **Pas** "pause/reprise", **pas** "gère les workflows multi-pages" : ces deux formulations promettent des API qui n'existeront pas.
