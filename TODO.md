# TODO — Website V1 (`apps/website`)

Site vitrine + documentation du package, en Astro + Starlight. Voir discussion pour le détail du choix de stack et de style (accent `#4c35fd`, inspiration tiptap.dev).

## Setup

- [ ] Scaffold `apps/website` (Astro + `@astrojs/starlight` + `@astrojs/react` + `@astrojs/vue` + `@astrojs/solid-js` + Tailwind v4)
- [ ] Ajouter au workspace root (`package.json` déjà configuré pour `apps/*`) + script `"docs": "bun run --cwd apps/website dev"`
- [ ] Dépendances `@glowhop/*-tour` en `workspace:*`
- [ ] Config des tokens de thème (clair/sombre) dérivés de `packages/styles/default.css` — accent `#4c35fd`
- [ ] Job CI build pour `apps/website` dans `.github/workflows/ci.yml`

## Pages marketing

- [ ] `/` — Home : hero (tour auto-lancé sur la page), stats, démo live par framework (tabs), grid de features, CTA final
- [ ] Pages par framework : `/react`, `/vue`, `/solid`, `/angular`, `/vanilla` (install + exemple copiable, ciblage SEO)

## Documentation (Starlight, sous `/docs`)

- [ ] Getting Started : installation, quick start par framework, concepts clés (steps, tour, popover, pointer)
- [ ] Guides par framework (React/Vue/Solid/Angular/Vanilla)
- [ ] Guides transverses : theming/CSS custom properties, accessibilité, positionnement/collision, contrôle programmatique, SSR/hydration
- [ ] API Reference (idéalement générée depuis les types de `packages/core`)
- [ ] Compatibility — reprendre/publier le contenu de `docs/compatibility.md`

## Hors V1 (backlog v2)

- [ ] `/compare` — tableau comparatif vs Shepherd.js / Intro.js / driver.js / react-joyride
- [ ] `/showcase` — sites utilisant Glow Tour
- [ ] `/changelog` — généré depuis les changesets/releases GitHub
- [ ] Recipes (cas d'usage concrets : onboarding SaaS, feature announcement, tour conditionnel)

## Déploiement

- [ ] Vercel ou Netlify, build statique (`astro build`)

# TODO — Rendre les packages compétitifs (dev)

Issu de l'étude comparative vs Driver.js / Shepherd.js / Intro.js / React Joyride / Reactour. Objectif : lever les blocages qui empêchent l'adoption avant même l'évaluation du DX.

## Compatibilité framework (priorité haute)

- [x] Élargir la peer dep React au-delà de `^19.2.0` (couvrir React 18) dans `packages/react/package.json`
- [x] Élargir la peer dep Vue au-delà de `^3.5.0` (couvrir 3.3/3.4) dans `packages/vue/package.json`
- [x] Élargir la peer dep Angular au-delà de `^18.2.0` (évaluer support 17) dans `packages/angular/package.json` — évalué, gardé à `^18.0.0` (les blocs `@if`/`@for` ne sont stables qu'à partir d'Angular 18, 17 non garanti sans test d'install réel)
- [x] Élargir la peer dep Solid au-delà de `^1.9.14` dans `packages/solid/package.json`
- [x] Documenter la matrice de compat élargie dans [docs/compatibility.md](docs/compatibility.md)

## Accessibilité (priorité haute)

ARIA de base déjà en place par adaptateur (`role="dialog"`, `aria-labelledby`/`aria-describedby`, `aria-live="polite"`, `aria-controls`/`aria-disabled`/`aria-label` — voir `tour-components.ts(x)` de chaque package). Reste à vérifier/compléter :

- [x] Vérifier que le focus trap ([packages/core/src/state/focus-guard.ts](packages/core/src/state/focus-guard.ts)) restaure bien le focus à l'élément déclencheur en fin de tour — déjà correct sur toutes les sorties (finish/cancel/erreur)
- [x] Vérifier/documenter les raccourcis clavier standards : `Esc` annule, flèches gauche/droite naviguent (cohérence entre adaptateurs) — géré une seule fois côté core, aucune divergence adaptateur
- [x] Passer un audit axe-core/Lighthouse sur `apps/playground` et corriger les violations restantes — 3 violations de contraste corrigées dans `apps/playground/lab/lab.css`
- [x] Documenter le comportement a11y dans le guide transverse "accessibilité" prévu au-dessus (section Documentation) — [docs/accessibility.md](docs/accessibility.md)

## SSR / Hydration

- [x] Vérifier et documenter le comportement d'hydratation réel pour chaque adapter (actuellement "non vérifié" dans [docs/compatibility.md](docs/compatibility.md)) — React/Vue/Solid vérifiés (SSR + hydration réels), Angular/Solid limites documentées explicitement
- [x] Ajouter un test SSR + hydration par adapter (Next.js pour React, Nuxt pour Vue, SolidStart pour Solid) — `apps/ssr-react`, `apps/ssr-vue`, `apps/ssr-solid` : vraies apps avec build de prod + tests Playwright (SSR + hydration + interactivité), tous verts. A aussi révélé et corrigé un vrai bug de build (`scripts/build-packages.ts` ne forçait pas `NODE_ENV=production`, donc le dist publié de `@glowhop/react-tour` embarquait `jsxDEV`, cassant tout build de prod consommateur type `next build`)

## API & DX (inspiré Driver.js)

- [ ] Ajouter une option `allowScroll`, `false` par défaut, qui empêche le scroll de la page pendant le tour
- [ ] Ajouter une option `preventCancel: () => {}` (signature à confirmer) permettant d'intercepter/bloquer conditionnellement une tentative d'annulation du tour
- [ ] Étudier l'API de [driver.js](https://driverjs.com/docs/api) et ajouter les méthodes/APIs manquantes pertinentes à `packages/core`
- [ ] Reprendre le flow d'instanciation inspiré de [driver.js basic usage](https://driverjs.com/docs/basic-usage) : `workflow.run()` plutôt que `tour.run(workflow)`

## Publication & mesurabilité

- [ ] Premier release public `0.1.0` via Changesets sur npm pour tous les packages `@glowhop/*`
- [ ] Ajouter les badges Bundlephobia/npm bundle size au README de chaque package
- [ ] CI : job qui échoue si la taille gzip d'un package dépasse un budget défini

## Exemples & onboarding développeur

- [x] Dossier `examples/` public (au moins un exemple minimal par framework, en dehors de `apps/playground` qui reste privé)
- [ ] Sandbox StackBlitz/CodeSandbox liée depuis le README pour chaque adapter
- [x] Vérifier que le quick start du README principal fonctionne tel quel en copier-coller (test manuel ou script de vérification) — snippet React cassé (éléments DOM manquants) corrigé
