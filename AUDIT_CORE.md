# Audit du package `@glowhop/core-tour`

Date : 31 août 2026

Périmètre : `packages/core`

Axes : developer experience (DX) et logique interne

## Synthèse

Le package repose sur de bonnes bases : API typée, définitions de workflow défensivement copiées, annulation par `AbortController`, protection contre les opérations concurrentes, et gestion transactionnelle soignée de la racine DOM.

Il n'est toutefois pas encore « production ready ». Deux défauts peuvent placer le contrôleur dans un état incorrect sans diagnostic fiable : une exception levée par un abonné à l'état traverse la machine d'état, et les échecs d'affichage sont absorbés avant que l'étape soit déclarée active. La logique DOM présente aussi des hypothèses implicites sur le document global, le cycle de vie des cibles et les capacités du navigateur.

Priorité recommandée : corriger les deux constats P1, clarifier le contrat de navigation, puis durcir les frontières DOM et les validations d'options avant de poursuivre les optimisations ou les refactors structurels.

| Priorité | Nombre | Interprétation |
| --- | ---: | --- |
| P1 | 2 | Peut casser un tour valide ou masquer une panne de rendu |
| P2 | 5 | Comportement incohérent, cas DOM mal géré ou coût runtime notable |
| P3 | 4 | Dette de DX, de contrat public ou de maintenance |

## Périmètre et méthode

Audit statique des sources de production, des points d'entrée, des types publics, du manifeste et du README de `packages/core`. Les fichiers de tests sont exclus du périmètre et ne servent pas de preuve dans ce rapport. Aucun comportement navigateur n'a été exécuté ; les constats DOM sont donc déduits des chemins de code.

Surfaces examinées :

1. API publique et builder (`src/index.ts`, `src/types`, `src/builder`, `src/definition`)
2. Machine d'état et cycle de vie (`src/runtime`)
3. Résolution des cibles et options (`src/utils`, `src/runtime/active-step.ts`)
4. Rendu DOM, focus, clavier et positionnement (`src/dom`, `src/elements`, `src/state`)
5. Contrat d'adapter et documentation (`src/adapter.ts`, `README.md`, `package.json`)

## Points forts

- Le builder invalide proprement un `WorkflowStepBuilder` après commit et produit une définition stable. Les options imbriquées connues sont copiées et gelées (`builder/index.ts:156-170`, `definition/workflow-definition.ts:77-137`).
- Le contrôleur utilise un token d'opération et un `AbortController` pour invalider les navigations précédentes. Les vérifications après chaque frontière asynchrone réduisent fortement les courses (`runtime/tour-controller.ts:391-455`).
- Le bridge de racine réserve la propriété avant les callbacks réentrants, effectue un rollback multi-étapes et ne restaure un attribut que s'il porte encore la valeur réclamée (`runtime/root-bridge.ts:145-220`, `runtime/root-bridge.ts:250-280`).
- Les workflows exposent des snapshots gelés au lieu des drafts internes, et les abonnements aux props sont libérés au changement de workflow (`runtime/active-step.ts:31-50`, `runtime/tour-controller.ts:132-141`).
- Les préoccupations d'accessibilité sont intégrées à la logique : focus initial restauré, boucle de focus, `inert`, `aria-modal`, raccourcis exposés avec `aria-keyshortcuts`, et respect de `prefers-reduced-motion`.
- Les helpers `.wait()` et `.waitUntil()` valident leurs durées et respectent le signal d'annulation (`builder/index.ts:33-107`, `builder/index.ts:211-243`).

## Constats P1

### 1. Une exception d'un abonné à l'état peut casser la machine d'état

**Preuve.** `state.subscribe()` appelle le listener directement à l'inscription, puis `publish()` invoque chaque listener sans isolation (`runtime/tour-controller.ts:81-91`, `runtime/tour-controller.ts:516-530`). `setStatus()` appelle `publish()` au milieu des transitions. Une exception consommateur peut donc être capturée comme une panne du tour ; pire, le passage à `error` republie l'état et peut relancer la même exception avant le nettoyage (`runtime/tour-controller.ts:146-158`, `runtime/tour-controller.ts:376-388`).

**Impact DX.** Un simple composant d'observation défectueux peut transformer une navigation correcte en rejet de `run()`/`advance()`, remplacer l'erreur utile et empêcher un nettoyage déterministe. Un observer ne devrait pas faire partie du chemin critique du moteur.

**Recommandation.** Définir explicitement la politique d'erreur des abonnés. Le choix le plus robuste est d'isoler chaque listener avec `try/catch`, de continuer la publication, puis de reporter l'erreur hors de la transition (hook `onSubscriberError`, `queueMicrotask(() => { throw error; })`, ou logger injectable). Appliquer la même politique à l'émission initiale.

### 2. Les pannes d'affichage sont absorbées et l'étape devient quand même active

**Preuve.** `appear()` attend overlay, popover et pointeur avec `Promise.allSettled()` mais n'inspecte aucun résultat (`dom/tour-view-driver.ts:329-355`). `show()` poursuit ensuite jusqu'à `active = true` (`dom/tour-view-driver.ts:169-182`), puis le contrôleur publie le statut `active` (`runtime/tour-controller.ts:266-281`). Les éléments reposent directement sur Web Animations et `commitStyles()` (`elements/base.ts:25-50`, `elements/popover.ts:354-382`) : une API absente, une keyframe invalide ou une erreur du callback de commit produit une rejection qui peut être silencieusement ignorée. Le remontage dynamique absorbe également toutes les erreurs (`dom/tour-view-driver.ts:243-261`).

**Impact DX.** Le consommateur peut recevoir un état `active` alors que le popover est invisible ou incomplet, sans `state.error` ni rejet exploitable.

**Recommandation.** Distinguer les animations optionnelles du rendu indispensable. Propager au minimum l'échec du popover et du callback de commit ; inspecter les résultats des effets secondaires optionnels. Pour le remontage, envoyer l'erreur vers `commands.reportError` au lieu d'un `.catch(() => {})`. Ajouter une vérification explicite des capacités Web Animations ou un fallback sans animation.

## Constats P2

### 3. Le runtime accepte une racine liée à un `Document`, mais utilise le realm global

**Preuve.** Le bridge valide `root.ownerDocument` et réserve les IDs par document (`runtime/root-bridge.ts:125-135`, `runtime/root-bridge.ts:180-195`). En revanche, la résolution des sélecteurs utilise `document`, les dimensions et le DPR utilisent `window`, le driver écoute le clavier et le scroll sur `window`, et le garde de focus utilise `document`/`Node`/`HTMLElement` globaux (`utils/utils.ts:3-23`, `utils/utils.ts:71-81`, `dom/tour-view-driver.ts:400-407`, `dom/tour-view-driver.ts:804-841`, `state/focus-guard.ts:25-53`).

**Impact DX.** Une racine ou une cible dans une iframe/un autre realm peut être acceptée au montage puis mal résolue, mal positionnée ou non pilotable au clavier. Le `instanceof HTMLElement` global rejette également les éléments provenant d'un autre realm.

**Recommandation.** Choisir et documenter un contrat unique : soit refuser explicitement les roots hors du document global, soit dériver `document`, `window`, constructeurs DOM, RAF et viewport de `root.ownerDocument.defaultView`. La seconde option est plus cohérente avec le bridge actuel. La résolution d'un sélecteur devrait recevoir le document de la racine.

### 4. Une cible détachée est considérée comme valide et sa disparition n'est pas traitée

**Preuve.** `resolveTargetElement()` retourne tout `HTMLElement` ou toute valeur du resolver sans vérifier `isConnected` (`utils/utils.ts:71-81`). `resolveTarget()` accepte toute valeur truthy (`runtime/tour-controller.ts:333-348`). Une fois l'étape active, la boucle de positionnement continue seulement à lire `getBoundingClientRect()` (`dom/tour-view-driver.ts:420-461`).

**Impact DX.** Une cible supprimée juste avant ou pendant une étape peut laisser un tour actif autour d'un rectangle nul, avec des handlers attachés à un nœud détaché. `missingTargetStrategy` ne couvre alors pas réellement le cas « target missing ».

**Recommandation.** Valider que la cible est un `HTMLElement` du realm attendu et qu'elle est connectée. Pendant l'étape, détecter la déconnexion et appliquer une politique explicite (`wait`, `skip`, `error`) ou ajouter une stratégie dédiée de perte de cible.

### 5. Les options nommées `disable*Button` contrôlent parfois toute navigation, parfois seulement l'UI

**Preuve.** `tour.advance()`, `tour.previous()` et `goToStep()` passent par `canNavigate()`, qui dépend de `disableAdvanceButton`/`disablePreviousButton` (`runtime/tour-controller.ts:161-197`, `runtime/tour-controller.ts:470-483`). À l'inverse, les méthodes de `StepContext` appellent `navigate()` directement et contournent ces gardes (`runtime/tour-controller.ts:397-422`).

**Impact DX.** Le nom promet un état de bouton, mais modifie l'API programmatique. Deux appels conceptuellement identiques (`tour.advance()` et `context.advance()`) n'ont pas le même comportement. `goToStep()` peut aussi devenir silencieusement inopérant à cause d'une option de présentation.

**Recommandation.** Séparer capacité métier et présentation : par exemple `navigation.advanceDisabled` pour bloquer toutes les voies, et `popover.disableAdvanceButton` uniquement pour le contrôle visuel. Toutes les commandes doivent ensuite passer par une seule fonction de transition atomique. Si le comportement actuel est intentionnel, renommer les options et le documenter clairement.

### 6. Les options runtime ne sont pas validées de façon homogène

**Preuve.** Les waits rejettent correctement les nombres non finis (`builder/index.ts:33-37`, `builder/index.ts:98-107`), mais `targetTimeout` est consommé tel quel (`runtime/tour-controller.ts:333-348`) et les durées d'animation sont transmises directement à Web Animations (`elements/base.ts:25-30`). Avec `targetTimeout: NaN` et la stratégie `wait`, la condition d'expiration ne peut jamais devenir vraie. Plusieurs valeurs géométriques sont seulement clampées localement, tandis que `opacity`, `padding`, `radius` ou `duration` n'ont pas de validation centrale.

**Impact DX.** Des options issues de JSON, de formulaires ou de JavaScript non typé peuvent produire une attente infinie, des styles invalides ou une erreur tardive du navigateur au lieu d'un message lié à l'option.

**Recommandation.** Valider et normaliser toutes les options lors de `build()` ou `run()`, avec des erreurs qui donnent le chemin exact (`steps[2].behavior.targetTimeout`). Utiliser les mêmes helpers de nombres finis pour les timings et la géométrie.

## Constats P3

### 8. `dispose()` laisse `state.get()` sur un snapshot obsolète

**Preuve.** `dispose()` efface le workflow, les étapes et les listeners sans republier (`runtime/tour-controller.ts:211-223`). `state.get()` continue de retourner le dernier snapshot (`runtime/tour-controller.ts:81-92`), potentiellement encore `active`, alors que les méthodes de commande lèvent ensuite `Tour controller is disposed`.

**Impact DX.** Les intégrations qui conservent la référence du tour voient un état contradictoire après destruction ; `subscribe()` devient silencieusement un no-op alors que les commandes lèvent.

**Recommandation.** Ajouter un statut `disposed`, ou documenter et appliquer une politique cohérente : snapshot terminal publié avant suppression des listeners, puis getters/subscribe explicitement invalidés.

### 9. Le README ne fournit pas un chemin d'adoption exécutable et décrit mal le rôle du core

**Preuve.** Le README affirme que Core n'a « no overlay, popover, or other presentation », alors que `createGlowTour()` instancie le driver DOM et exige une racine/popover connectés pour un workflow non vide. L'exemple s'arrête sur « Pass tour to a mounted adapter/default composition » sans import d'adapter ni lien vers une intégration concrète (`README.md:3-15`). La table indique aussi « step/start scroll », alors que l'option est imbriquée sous `behavior.scroll` (`README.md:21-28`, `types/index.ts:28-35`).

**Impact DX.** Le premier exemple compile mais ne montre pas comment obtenir un tour fonctionnel. Un auteur d'adapter doit déduire le markup, les attributs de triggers, le cycle bind/unbind et les mutations DOM depuis les sources.

**Recommandation.** Présenter clairement Core comme moteur + driver DOM sans rendu de composants. Ajouter deux recettes minimales : consommation via un adapter officiel et création d'un adapter avec `connectGlowTourRoot`. Documenter le markup/les attributs requis, le cycle de lease, les prérequis navigateur et le comportement d'annulation.

### 10. Le contrat public expose l'implémentation `Observable`

**Preuve.** `StepPropsStore<T>` est un alias direct de `Observable` depuis `@glowhop/observables`, puis exposé dans `StepContext` (`types/index.ts:1`, `types/index.ts:116-130`). Le package possède déjà une abstraction minimale `ReadonlyStepState`, mais elle n'est pas utilisée ici. Le consommateur doit donc connaître une dépendance interne pour savoir comment modifier les props.

**Impact DX.** L'API framework-agnostic est couplée à une bibliothèque d'observables et à l'intégralité de son contrat public. Une évolution de cette dépendance devient potentiellement un breaking change de Core.

**Recommandation.** Exposer une interface locale minimale et documentée (`get`, `set`/`update`, `subscribe`) puis adapter l'Observable en interne. Cela rend aussi explicite la mutabilité autorisée pendant une action.

### 11. Les mutations DOM et l'injection CSS ne sont pas contractualisées

**Preuve.** Le popover reçoit des styles inline, `tabindex`, `aria-hidden` et `inert` lors de l'initialisation (`elements/popover.ts:187-207`), mais `release()` ne restaure pas toutes les valeurs précédentes (`elements/popover.ts:391-397`). Le garde de focus restaure également le `tabindex` mémorisé sans vérifier si le consommateur l'a modifié entre-temps (`state/focus-guard.ts:122-138`). Enfin, les styles de flèche sont injectés avec un élément `<style>` sans mécanisme de nonce ou de fourniture externe (`elements/popover-arrow-styles.ts:53-70`).

**Impact DX.** Le binding sur un élément réutilisé peut écraser des décisions du consommateur après release. Une CSP stricte peut bloquer la flèche sans diagnostic clair.

**Recommandation.** Étendre le mécanisme de « claim » déjà utilisé par `root-bridge` aux attributs/styles des éléments, ou exiger contractuellement des éléments dédiés et jetables. Fournir une option CSP : stylesheet exportable, nonce, ou désactivation de l'injection automatique.

## Simplifications proposées

Ces propositions visent à supprimer du code ou des concepts. Elles ne nécessitent pas de nouvelle couche d'abstraction.

| Tag | Localisation | Simplification | Remplacement |
| --- | --- | --- | --- |
| `delete` | `types/index.ts:23-26`, `types/index.ts:140-145` | `WaitOptions` et `WaitUntilOptions` décrivent le même objet. | Conserver uniquement `WaitOptions`, avec les commentaires de valeurs par défaut, et l'utiliser dans le builder. |
| `delete` | `types/index.ts:116-119`, `types/index.ts:154-158`, `runtime/active-step.ts:20-44` | `StepWaitPredicate` n'est utilisé par aucun chemin de production et `ReadonlyStepState` ne sert qu'à maintenir `ActiveStep.state`, dont seul `get()` est consommé en interne. | Supprimer `StepWaitPredicate`, `ReadonlyStepState` et `ActiveStep.state`; construire le contexte `before*` depuis `step.props.get()` avec `freezeStepProps`. |
| `yagni` | `dom/tour-view-driver.ts:52-68`, `runtime/tour-controller.ts:94-98` | `NoopTourViewDriver` n'a aucun appelant de production autre que la valeur par défaut d'un contrôleur qui reçoit toujours `DomTourViewDriver` via `createGlowTour()`. | Rendre le driver obligatoire dans le constructeur et supprimer l'implémentation no-op. Si un contrôleur headless doit devenir public, le traiter comme une fonctionnalité explicite plutôt qu'une valeur par défaut cachée. |
| `shrink` | `runtime/tour-controller.ts:65-98`, `runtime/tour-controller.ts:521-529` | Le snapshot est stocké dans un `Observable`, mais ses abonnements ne sont jamais utilisés : un second système manuel, `stateListeners`, réalise déjà toute la publication. | Remplacer `snapshot: Observable<TourState<T>>` par `snapshot: TourState<T>` et affecter directement la nouvelle valeur dans `publish()`. |
| `shrink` | `builder/index.ts:47-62`, `runtime/tour-controller.ts:32-45` | Deux helpers implémentent le même délai annulable avec des différences mineures. | Garder un seul `abortableDelay(delay, signal)` dans un module ciblé comme `runtime/abort.ts`; il doit vérifier immédiatement `signal.aborted`. |
| `native` | `utils/utils.ts:55-69`, `elements/popover.ts:158` | `toggleElementAttribute()` réimplémente le fallback de `Element.toggleAttribute()`, alors que Core dépend déjà d'API navigateur plus récentes (`inert`, Web Animations, `structuredClone`, `scrollend`). | Appeler directement `element.toggleAttribute(name, enabled)` et déclarer le niveau de compatibilité navigateur. |
| `shrink` | `elements/base.ts:12`, `elements/overlay.ts:14`, `elements/pointer.ts:21`, `elements/popover.ts:35` | Le paramètre générique `T` traverse toute la hiérarchie des éléments sans être lu. | Retirer le générique de `GlowTourElement`, `OverlayElement`, `PointerElement` et `PopoverElement`, ainsi que des champs correspondants du driver. |
| `shrink` | `runtime/active-step.ts:69-74` | `snapshot()` clone et regèle `initialProps` à chaque publication alors que cette valeur est déjà gelée à la construction. | Retourner directement `initialProps`; ne cloner que les props courantes mutables. |
| `delete` | `dom/tour-view-driver.ts:436-445`, `elements/popover.ts:207`, `elements/popover.ts:384-388` | Il reste un log de debug, une ligne commentée et une double affectation de `opacity: 0`. | Supprimer ces lignes sans remplacement. |
| `shrink` | `definition/workflow-definition.ts:116-126` | `actions: definition.actions.map((action) => action)` exprime une copie simple avec un callback identité. | Utiliser `actions: [...definition.actions]`, comme pour `eventHandlers`. |

Estimation conservatrice : **environ 60 lignes supprimables**, avec moins de types publics et un chemin d'état plus direct.

`net: -60 lines possible.`

### Utilitaires réellement utiles

Deux extractions seulement ont un rapport coût/bénéfice positif aujourd'hui :

1. `runtime/abort.ts` : `abortError()`, `throwIfAborted()` et `abortableDelay()`, déjà dupliqués entre builder, contrôleur et driver.
2. `options/validation.ts` : `assertFiniteNonNegative(path, value)` et les validateurs associés, à introduire au moment de corriger le constat P2 n°6.

Il ne faut pas créer un nouveau `utils.ts` générique. Le fichier actuel mélange géométrie DOM, attributs et résolution de cible (`utils/utils.ts`) ; les nouveaux helpers doivent rester proches de leur domaine. Les helpers géométriques existants (`viewportDimensions`, `isInViewport`, `roundByDPR`, `roundedRectPath`) sont réutilisés et méritent d'être conservés ensemble, idéalement sous un nom explicite comme `dom/geometry.ts` si le fichier est déjà déplacé pour une autre raison.

## Dette structurelle notable

`DomTourViewDriver` regroupe orchestration du rendu, animations, scroll, modalité, focus, clavier, délégation de clics, observation du DOM et boucle de positionnement dans un fichier d'environ 900 lignes. Ce n'est pas un défaut fonctionnel en soi. Le découper immédiatement en quatre classes ajouterait des interfaces, de l'injection et des transitions d'état distribuées sans réduire la logique.

Approche recommandée : corriger d'abord les P1/P2 dans le fichier actuel, extraire uniquement les fonctions pures ou réellement dupliquées, puis réévaluer la taille. Une extraction plus large n'est justifiée que si un sous-ensemble possède un état autonome et peut être testé via un contrat plus petit que celui du driver complet.

## Plan de correction recommandé

1. Isoler les erreurs des abonnés et propager les échecs indispensables du rendu.
2. Unifier le pipeline de commande/navigation et décider ce que signifie réellement `disable*Button`.
3. Ajouter une validation centralisée des workflows/options et valider le cycle de vie des cibles.
4. Choisir officiellement le support mono-document ou multi-realm, puis rendre tout le runtime cohérent avec ce choix.
5. Réduire le coût de positionnement continu et traiter explicitement la disparition d'une cible.
6. Stabiliser la surface publique (`StepPropsStore`, état après dispose, contrat adapter/CSP) et réécrire le README autour de scénarios exécutables.
7. Réévaluer `DomTourViewDriver` après ces suppressions ; ne découper qu'une responsabilité possédant un état et un contrat réellement autonomes.

## Limites de l'audit

- Aucun fichier de test n'entre dans l'analyse ; la couverture existante de ces cas n'est pas évaluée.
- Aucun test navigateur, profilage de performance ni vérification dans une iframe/Shadow DOM n'a été exécuté.
- Les adapters React, Vue, Angular, Solid et Vanilla sont hors périmètre ; certains contrats implicites de Core peuvent être compensés par ces packages, sans que cela rende le contrat Core autonome.
- L'audit ne couvre ni la chaîne de publication npm ni les workflows GitHub Actions.
