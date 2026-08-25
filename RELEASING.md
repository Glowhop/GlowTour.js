# Publier une nouvelle version

Le projet utilise [Changesets](https://github.com/changesets/changesets) pour les versions et GitHub Actions pour publier sur npm.

## Choisir le type de version

- `patch` (`1.2.3` → `1.2.4`) : correction compatible avec l'API actuelle.
- `minor` (`1.2.3` → `1.3.0`) : nouvelle fonctionnalité rétrocompatible.
- `major` (`1.2.3` → `2.0.0`) : changement incompatible avec l'API actuelle.

Tous les packages `@glowhop/*-tour` sont versionnés ensemble. Le niveau le plus élevé présent dans les changesets détermine la prochaine version commune.

## 1. Créer un changeset

Depuis la racine du dépôt :

```bash
bun run changeset
```

Sélectionner les packages concernés, choisir `patch`, `minor` ou `major`, puis écrire un résumé destiné au changelog. Commiter le fichier créé dans `.changeset/` avec les changements :

```bash
git add .changeset
git commit -m "chore: add changeset"
```

## 2. Fusionner la PR de version

Après la fusion des changements dans `main`, l'action GitHub `Changesets` crée ou met à jour une PR de version. Cette PR met à jour les versions et les changelogs.

Vérifier son contenu, attendre la réussite de la CI, puis la fusionner dans `main`.

## 3. Publier la GitHub Release

Créer une nouvelle GitHub Release depuis le commit de la PR de version fusionnée :

1. Créer un tag correspondant exactement à la version, par exemple `v1.3.0`.
2. Vérifier que la cible du tag appartient à la branche `main`.
3. Publier une release stable, et non une préversion.

L'action GitHub `Publish release` vérifie le projet, construit les packages et publie automatiquement les versions manquantes sur npm.

La publication npm réelle est volontairement interdite en local. Pour vérifier les artefacts sans publier :

```bash
bun run build
bun run release:prepare
bun run release:publish -- --dry-run
```
