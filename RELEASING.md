# Publier les packages sur npm

Le projet utilise [Changesets](https://github.com/changesets/changesets) pour gérer les versions et GitHub Actions pour publier sur npm. Une publication réelle doit toujours partir d'une GitHub Release stable : elle ne doit pas être lancée en local.

Sept packages publics sont publiés ensemble sous le scope npm `@glowhop` :

1. `@glowhop/core-tour`
2. `@glowhop/styles-tour`
3. `@glowhop/react-tour`
4. `@glowhop/vue-tour`
5. `@glowhop/angular-tour`
6. `@glowhop/solid-tour`
7. `@glowhop/vanilla-tour`

Le playground est privé et n'est jamais publié.

## Configuration initiale

### Organisation npm

L'organisation npm `glowhop` doit exister et le compte chargé de l'initialisation doit avoir les droits de publication sur ce scope. L'authentification à deux facteurs doit être activée.

### Trusted Publishing

Chaque package existant sur npm doit autoriser le workflow GitHub Actions qui réalise la publication. Dans les réglages npm de chacun des sept packages, configurer un **Trusted Publisher** avec les valeurs suivantes :

- fournisseur : `GitHub Actions`
- organisation ou utilisateur GitHub : `Glowhop`
- dépôt : `glow-tour`
- nom du workflow : `release.yml`
- environnement : aucun
- action autorisée : `npm publish`

Cette configuration utilise OIDC. Aucun `NPM_TOKEN` permanent ne doit être ajouté au workflow de release.

> Un Trusted Publisher ne peut être configuré que pour un package qui existe déjà sur npm. Pour la toute première publication, utiliser un workflow GitHub Actions temporaire avec un token npm granulaire et à durée de vie courte. Après cette publication initiale, configurer le Trusted Publisher sur les sept packages, révoquer le token, puis supprimer le workflow temporaire. Ne pas amorcer les packages avec une publication locale.

Documentation npm : [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/).

## Processus pour chaque version

### 1. Créer un Changeset

Toute PR qui modifie le comportement publié doit contenir un Changeset :

```bash
bun run changeset
```

Choisir le niveau de version approprié :

- `patch` (`1.2.3` → `1.2.4`) : correction compatible avec l'API actuelle ;
- `minor` (`1.2.3` → `1.3.0`) : nouvelle fonctionnalité rétrocompatible ;
- `major` (`1.2.3` → `2.0.0`) : changement incompatible.

Sélectionner les packages concernés et écrire un résumé factuel destiné au changelog. Tous les packages publics appartiennent au même groupe de versions : le niveau le plus élevé demandé détermine leur prochaine version commune.

Commiter le fichier généré dans `.changeset/` avec les modifications concernées.

### 2. Fusionner la PR fonctionnelle

Fusionner la PR dans `main` après validation de la CI. Le workflow `Changesets` crée ou met alors à jour une PR de version.

### 3. Fusionner la PR de version

Vérifier que la PR de version :

- applique la même version aux sept packages publics ;
- met à jour les changelogs attendus ;
- consomme les fichiers Changesets concernés ;
- passe toute la CI.

Fusionner ensuite cette PR dans `main`.

### 4. Publier la GitHub Release

Créer une GitHub Release depuis le commit de la PR de version fusionnée :

1. utiliser un tag au format exact `vX.Y.Z`, par exemple `v1.3.0` ;
2. faire correspondre le tag à la version présente dans les `package.json` ;
3. cibler un commit appartenant à `main` ;
4. publier une release stable, sans activer l'option de préversion.

La publication de la GitHub Release déclenche le workflow `Publish release`. Celui-ci exécute les contrôles, les tests, les builds, la validation des archives, puis publie les versions absentes de npm dans l'ordre indiqué plus haut.

Le workflow peut être relancé après un échec partiel : les packages dont la version existe déjà sur npm sont ignorés et la publication reprend sur les suivants.

## Vérification locale sans publication

Les artefacts peuvent être vérifiés localement sans modifier npm :

```bash
bun run check
bun run typecheck
bun test
bun run test:browser
bun run build
bun run pack
bun run test:tarballs
bun run --cwd apps/playground build
bun run release:prepare
bun run release:publish -- --dry-run
```

Ne jamais exécuter directement `npm publish` depuis un poste local.

## Corriger une version défectueuse

Une version npm publiée est immuable : ne jamais essayer de la remplacer ou de réutiliser son numéro.

1. Déprécier la version défectueuse sur npm avec une raison concise.
2. Préparer un Changeset de niveau `patch` contenant la correction.
3. Publier une nouvelle version avec le processus normal décrit ci-dessus.
