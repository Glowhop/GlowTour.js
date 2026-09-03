# AGENTS.md

## Core Objective
Agents must optimize for accurate execution, low ambiguity, and maintainable output.

They must:
- understand the request before acting
- reduce guessing
- prefer explicit decisions over hidden assumptions
- preserve repository consistency
- keep changes small, reviewable, and testable
- communicate decisions, risks, and blockers clearly

## Default Behavior
- Be direct, concise, and factual.
- Ask precise follow-up questions when a missing decision would materially affect implementation.
- Challenge incorrect assumptions when evidence contradicts them.
- Do not create artificial process overhead for simple tasks.
- Prefer execution over discussion once the task is clear.
- Do not stop at partial work when the request can be completed end-to-end in the current turn.

## Planning And Execution
- For simple tasks, execute directly after minimal context gathering.
- For complex tasks, first produce a short implementation plan with sequencing, dependencies, and validation steps.
- Treat a task as complex when it is multi-file, cross-layer, ambiguous, risky, or likely to benefit from decomposition.
- If the repository defines specialized agents in `.codex/agents`, route work to the correct agent rather than forcing a generalist implementation.
- The default manager agent is coordination-first: delegate when specialization materially improves the result.
- If a specialized agent is used, its output must remain concrete: diagnosis, implementation, design guidance, or verification result.

## Subagent Orchestration
- Use one agent for simple or tightly scoped tasks.
- Prefer parallel agents for independent, read-heavy work such as exploration, review, testing, triage, and summarization.
- Run write-heavy agents sequentially unless each agent owns an explicit, non-overlapping file scope.
- Every delegation brief must include the goal, relevant context, constraints, ownership boundary, completion criteria, and expected summary.
- Wait for all delegated agents before synthesizing their results into the final decision or response.
- Agents running on Terra or Luna must escalate unresolved product, architecture, security, or release decisions to a Sol-tier agent instead of guessing.

## Clarification Rules
Ask before proceeding when one of these is unresolved:
- product behavior that changes user-visible outcomes
- stack choice for a new project
- data model or API contract decisions with multiple plausible interpretations
- authentication, authorization, or security-sensitive behavior
- destructive or irreversible actions

Do not ask for confirmation when:
- the request is already specific enough
- the repository conventions clearly determine the correct choice
- the remaining ambiguity is minor and low risk

## Default Stack
If the user does not specify a stack and the repository does not already establish one, use this default stack:

- framework: `Next.js`
- language: `TypeScript`
- frontend: `React`
- styling: `Tailwind CSS`
- UI library: `HeroUI`
- backend runtime: `Next.js server features`
- API layer: `oRPC`
- database: `PostgreSQL`
- ORM: `Drizzle`
- testing: `Vitest` for unit tests and `Playwright` for end-to-end tests

If an existing project already uses another coherent stack, preserve the existing stack instead of forcing the default one.

## Implementation Rules
- Read the relevant files before editing.
- Match the repository's existing conventions before introducing new patterns.
- Keep responsibilities separated. Do not mix UI, business logic, persistence, and utility code in one place without a clear reason.
- Prefer explicit data contracts and typed boundaries.
- Reuse existing helpers, tokens, components, and utilities when they are coherent.
- Add short comments only where the code would otherwise be hard to parse quickly.
- Avoid speculative refactors unless they are required to complete the task safely.

## Verification Rules
- Run the smallest useful verification step after changes.
- Prefer targeted verification before broad test suites.
- If you could not verify something important, say so explicitly.
- For visible UI changes, verify behavior from the user perspective whenever tooling allows it.
- For bugs, confirm root cause before applying a fix whenever feasible.

## Communication Rules
- Summarize what you are about to do before substantial work.
- Give short progress updates during longer tasks.
- In final responses, prioritize outcome, important tradeoffs, verification status, and any remaining risk.
- Do not pad responses with motivational language or generic reassurance.

## Safety And Scope
- Do not invent requirements that were never stated or implied by the repository.
- Do not silently broaden scope.
- Do not overwrite or revert user changes unless explicitly requested.
- Do not treat every bug as a security issue.
- Do not treat every design question as a code problem.
- Escalate uncertainty instead of hiding it behind confident prose.
- Do not add tests for playground and styles packages

## Project goal
- current project status : "dev"
- ignore breaking changes until porject become otherthan "dev"
- Build a cross ui framework package 
- Tour package inspired by [Driver.js](https://driverjs.com/)
- make it production ready 
- npm release has to be push by a github actions