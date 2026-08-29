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
- [x] Modalité exclusive et inertness bornée.
- [x] Contrat d’acceptance cross-framework.
- [x] Changeset `minor` pour `@glowhop/core-tour`.
- [x] Validation finale.

## Baseline

Validation du 29 août 2026 :

- `bun run check` : passe, 113 fichiers.
- `bun run typecheck` : passe.
- `bun test` : passe, 249 tests.
- `bun run test:browser` : passe, 69 tests Happy DOM.

## Commits

- `e2955dd fix(core): simplify interactive focus scope`
- `fa70812 fix(core): isolate modal tours per document`

## Dernière validation

- Validation finale du 29 août 2026 :
  - `bun run check` : passe, 113 fichiers.
  - `bun run typecheck` : passe.
  - `bun test` : passe, 255 tests.
  - `bun run test:browser` : passe, 69 tests Happy DOM.
  - `bun run build` : passe, 7 packages.
  - `bun run pack` : passe, 7 tarballs.
  - `bun run test:tarballs` : passe, contrat smoke de 7 packages ; relancé avec accès réseau après blocage de l’installation en sandbox.
  - `bun run --cwd apps/playground build` : passe ; avertissement Vite existant sur la taille du chunk Angular.

## Reprise

Étape 2 terminée. Aucun travail inachevé ni blocage connu. Playwright, SSR/hydratation et la normalisation des options ARIA restent reportés conformément au périmètre.
