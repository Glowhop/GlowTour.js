# AGENTS.md

GlowTour.js is a cross-framework guided-tour library published as a Bun workspace monorepo: `packages/core` (no presentation) plus the `react`, `vue`, `angular`, `solid`, and `vanilla` adapters and `packages/styles`. Demo and docs apps live in `apps/` (`playground`, `website`, and the `ssr-*` smoke apps).

## Default Behavior
- Be direct, concise, and factual. No padding, no motivational filler.
- Ask a precise follow-up only when a missing decision would materially change the implementation.
- Challenge incorrect assumptions when evidence contradicts them.
- Prefer execution over discussion once the task is clear, and finish the task end-to-end in the turn when it is doable.

## Planning And Execution
- Simple tasks: execute directly after minimal context gathering.
- Complex tasks (multi-file, cross-layer, ambiguous, or risky): produce a short plan with sequencing, dependencies, and validation steps first.
- Route work to the specialized agents defined in `.codex/agents` (Codex) or `.claude/agents` (Claude Code) rather than forcing a generalist implementation. Whatever the agent, its output must stay concrete: diagnosis, implementation, design guidance, or verification result.

## Subagent Orchestration
- One agent for simple or tightly scoped tasks.
- Parallel agents for independent read-heavy work: exploration, review, testing, triage, summarization.
- Write-heavy agents run sequentially unless each owns an explicit, non-overlapping file scope.
- Every delegation brief states goal, context, constraints, ownership boundary, completion criteria, and expected summary.
- Wait for all delegated agents before synthesizing the final answer.

## Clarification Rules
Ask before proceeding when one of these is unresolved:
- public API surface or contract changes with several plausible interpretations
- behavior visible to the library's users
- destructive or irreversible actions

Do not ask when the request is already specific, when repository conventions settle the choice, or when the remaining ambiguity is minor and low risk.

## Implementation Rules
- Read the relevant files before editing.
- Match existing repository conventions before introducing new patterns.
- Keep `packages/core` free of presentation and of hardcoded browser globals; adapters own the framework-specific layer.
- Prefer explicit data contracts and typed boundaries. Reuse existing helpers, tokens, and utilities when coherent.
- Comment only where the code would otherwise be hard to parse quickly.
- No speculative refactors unless required to complete the task safely.

## API Design Rules — recette plutôt que feature
Priorité : flexibilité et DX, obtenues en **limitant** la surface d'API publique, pas en l'étendant.

- Avant d'ajouter une API publique, vérifier qu'elle est **impossible à écrire depuis l'extérieur**. Si l'app peut le faire en quelques lignes avec ce que le core expose déjà, c'est une recette à documenter dans `docs/`, pas une option à livrer.
- Le core fournit des **primitives** (identité, points d'entrée, hooks) ; les **politiques** restent à l'app : stockage, routeur, analytics, i18n, TTL, gestion multi-onglets. Chaque app les veut différentes, et le core ne peut pas deviner mieux qu'elle.
- Ne jamais coder en dur un global navigateur (`window`, `sessionStorage`, `location`) dans `packages/core`. Laisser l'app y toucher préserve le SSR par construction — c'est un argument de vente, pas un détail.
- Refuser une seconde façon de faire une chose déjà faisable. Deux chemins pour le même besoin coûtent plus cher qu'une contrainte : ils créent une question à trancher à chaque usage.
- Préférer un champ requis à un champ optionnel qui crée deux modes (deux branches d'état, deux paragraphes de doc). La contrainte est moins chère que la complexité.
- Asymétrie à garder en tête : ajouter une API plus tard est additif, la retirer est breaking. En cas de doute, ne pas l'ajouter — et n'absorber dans le core que ce qui est **prouvé** réécrit à l'identique par plusieurs apps.
- Communication : annoncer ce que la lib fait réellement. « Reprise en deux lignes, avec ton stockage et ton routeur » est plus fort et plus vérifiable que « gère le multi-page ». Ne pas promettre dans le README ce que la doc ne peut pas démontrer.
- Toute décision d'écarter une API doit être **écrite** dans `docs/` avec sa raison (voir `docs/json-config-design.md`), pour ne pas être reposée trois mois plus tard.

## Verification Rules
- Run the smallest useful verification step after changes: `bun run check`, `bunx tsc -p tsconfig.json --noEmit`, `bun test`, scoped to what was touched.
- Targeted verification before broad suites.
- For visible UI changes in an adapter, verify from the user's perspective in a real browser (`bun run playground`) rather than trusting types and unit tests alone.
- For bugs, confirm root cause before applying a fix whenever feasible.
- Say so explicitly when something important could not be verified.

## Safety And Scope
- Do not invent requirements the repository never stated, and do not silently broaden scope.
- Do not overwrite or revert user changes unless asked.
- Do not add tests for `apps/playground` or `packages/styles`.
- Escalate uncertainty instead of hiding it behind confident prose.

## Project goal
- The library is in production: public API changes are breaking changes and need a changeset.
- Keep the package production-ready across all supported UI frameworks.
- npm publishing happens through GitHub Actions, never by hand; see [docs/release.md](docs/release.md) and [RELEASING.md](RELEASING.md).
