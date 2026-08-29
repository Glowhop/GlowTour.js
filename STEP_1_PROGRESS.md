# Étape 1 — Journal d’avancement

Branche : `codex/tour-api-step1`  
Worktree : `/private/tmp/glow-tour-step1-codex`

## Contraintes validées

- Les breaking changes sont autorisés pendant la phase `dev`.
- `run()` rejette systématiquement un workflow non vide sans popover connecté.
- Les primitives avancées restent disponibles.
- La composition par défaut utilise l’ordre de boutons `Cancel`, `Back`, `Advance`.
- Le bridge partagé est publié via `@glowhop/core-tour/adapter`.

## Avancement

- [x] 1. Nettoyer les options inertes et types legacy du core. (`a3b3bbb`, revue propre)
- [x] 2. Publier le bridge partagé `core/adapter`. (`4b9a117` + `c45c4c1`, revue propre)
- [x] 3. Migrer les cinq adapters vers le bridge partagé. (`9f04322`, revue propre)
- [x] 4. Refuser les workflows non vides sans popover. (`e74b98e`, fonctionnellement validé ; exception TDD acceptée)
- [x] 5. Étendre le contrat d’acceptance aux compositions par défaut. (`7d53fae`, avec le lot 6)
- [x] 6. Ajouter `DefaultTour` à React et Solid. (`7d53fae`, revue propre)
- [x] 7. Ajouter `GlowTourDefault` à Vue et Angular. (`5805f7a`, revue propre)
- [x] 8. Ajouter la factory de composition Vanilla. (`f746b90` + `f14103e`, revue propre)
- [x] 9a. Normaliser et tester la matrice publique des cinq adapters. (`bcebefc`, revue propre)
- [x] 9b. Vérifier les builds, manifests, tarballs et Changesets. (`c45d69a` + `b7d18fe`, revue propre)
- [ ] Revue finale de branche.

## Dernière validation

Validation complète du 29 août 2026 :

- `bun run check` : passe, 113 fichiers.
- `bun run typecheck` : passe.
- `bun test` : passe, 249 tests.
- `bun run test:browser` : passe, 69 tests Happy DOM.
- `bun run build` : passe, 7 distributions.
- `bun run pack` : passe, 7 tarballs locaux.
- `bun run test:tarballs` : passe pour 7 packages avec installation npm stricte ; premier essai sandboxé sans réseau échoué sur les métadonnées React tierces, relance réseau autorisée réussie.
- Aucune publication, aucun dry-run de publication, aucun lookup npm des packages Glow Tour, aucun tag ou release.

Task 9a, validation ciblée du 29 août 2026 :

- Contrats des cinq adapters : 15 passent, 0 échec.
- Typecheck racine : passe.
- Types concrets sans générique et formes runtime inchangées validés.

Task 8, validation ciblée du 29 août 2026 :

- Contrat Vanilla : 2 passent, 0 échec.
- Typecheck racine : passe.
- Factory DOM, SSR import-safe et type concret `Tour` validés.
- Suite navigateur complète passée par l’agent sur la révision runtime.

Task 7, validation ciblée du 29 août 2026 :

- Contrats Vue/Angular : 7 passent, 0 échec.
- Tests navigateur Vue/Angular : 25 passent, 0 échec.
- Typecheck racine : passe.
- Hiérarchie native et ordre `Cancel`, `Back`, `Advance` validés, y compris avec les hosts Angular.

Tasks 5-6, validation ciblée du 29 août 2026 :

- Contrats React/Solid : 6 passent, 0 échec.
- Tests navigateur React/Solid : 26 passent, 0 échec.
- Typecheck racine : passe.
- Hiérarchie et ordre `Cancel`, `Back`, `Advance` couverts par le contrat partagé.

Task 4, validation ciblée du 29 août 2026 :

- Tests root bridge/controller : 77 passent, 0 échec.
- Suite complète : 249 passent, 0 échec.
- Typechecks core et racine : passent.
- Revue fonctionnelle et qualité : passe.
- Exception acceptée : la chronologie RED originale a été perdue avec l’arrêt du premier agent ; un test de sensibilité reconstruit confirme la régression.

Task 3, validation ciblée du 28 août 2026 :

- Contrats unitaires des cinq adapters : 15 passent, 0 échec.
- Typecheck racine : passe.
- Aucun client bridge ou marqueur framework dupliqué ne subsiste.

Task 2, validation ciblée du 28 août 2026 :

- Tests adapter/root bridge : 27 passent, 0 échec.
- Typechecks core et racine : passent.
- Build core multi-entrypoint : `adapter.js` et `adapter.d.ts` générés.

Task 1, validation ciblée du 28 août 2026 :

- `bunx tsc -p packages/core/tsconfig.json --noEmit` : passe.
- Tests builder/options : 21 passent, 0 échec.

Baseline du 28 août 2026 :

- `bun run check` : passe, 109 fichiers.
- `bun run typecheck` : passe.
- `bun test` : passe, 236 tests.
- `bun run test:browser` : passe, 64 tests Happy DOM.

## Reprise

Reprendre à la première case non cochée. Lire ensuite les commits de la branche et les rapports sous `.superpowers/sdd/`.
