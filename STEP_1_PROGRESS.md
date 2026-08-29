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
- [ ] 7. Ajouter `GlowTourDefault` à Vue et Angular.
- [ ] 8. Ajouter la factory de composition Vanilla.
- [ ] 9. Vérifier la matrice publique, les builds et les tarballs.
- [ ] Revue finale de branche.

## Dernière validation

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
