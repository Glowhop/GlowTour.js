# Étape 2 — Journal d’avancement

Branche : `codex/tour-focus-step2`

## Périmètre

- Simplifier le scope de focus sans scan global du DOM.
- Aligner le focus et la modalité sur `allowInteraction`.
- Limiter la modalité à un tour actif par document.
- Neutraliser uniquement les branches sœurs entre la racine du tour et `body`.
- Reporter Playwright, SSR/hydratation et la normalisation des options ARIA.

## Décisions

- `allowInteraction !== true` : popover modal, focus borné au popover et fond `inert`.
- `allowInteraction === true` : focus autorisé dans le popover et la target, sans boucle Tab.
- Une seconde modale dans le même document échoue explicitement.
- Aucun `MutationObserver` ni parcours des descendants de l’application.
- Le support Shadow DOM n’est pas inclus dans ce lot.

## Avancement

- [x] Baseline de la branche.
- [x] Simplification du focus.
- [ ] Modalité exclusive et inertness bornée.
- [ ] Contrat d’acceptance cross-framework.
- [ ] Changeset et validation finale.

## Baseline

Validation du 29 août 2026 :

- `bun run check` : passe, 113 fichiers.
- `bun run typecheck` : passe.
- `bun test` : passe, 249 tests.
- `bun run test:browser` : passe, 69 tests Happy DOM.

## Commits

- Focus : tests RED confirmés (4 échecs attendus), puis 71 tests ciblés et typecheck Core au vert.

## Dernière validation

En attente.

## Reprise

Reprendre à la modalité exclusive et l’inertness bornée. Aucun blocage connu.
