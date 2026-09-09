---
title: Resuming a tour
description: Restart a tour on a specific step after a reload, a route change, or a later session — with your own storage and your own router.
---

A tour can start on any step, not just the first one. That single option is what makes a tour survive a full page reload, a SPA navigation that unmounts the root, or a user coming back the next day.

## The one hard limit

**A workflow can never be serialized.** Step callbacks — `do`, `waitUntil`, `beforeAdvance`, function targets, event handlers — are code, and code does not round-trip through storage. So what you persist is never the tour itself: it is a pointer to a step in a workflow your app rebuilds from its own source.

In practice: save a step id, rebuild the workflow on the next page exactly as you built it on the first, and hand the id to `run()`.

## Step ids

Every step declares an `id`, unique within its workflow:

```typescript
const workflow = tour
  .create("onboarding")
  .step({ id: "welcome", target: "#kpi-card", title: "Welcome", content: "Start here." })
  .step({ id: "invite", target: "#invite-button", title: "Invite", content: "Add your team." })
  .build();
```

The id is validated when the workflow is built, not when it runs: a missing or duplicated id throws immediately, naming the offending step.

Ids are also the reason indexes are not accepted as a resume position. An index silently points at a different step the moment you reorder or insert one; an id either matches or fails loudly.

## Resuming

`run()` takes an optional second argument:

```typescript
await tour.run(workflow, { startAt: "invite" });
```

The workflow is not truncated. `totalSteps` is unchanged, the step indicator still reads `2 / 5`, and `previous()` can walk back before the step you resumed on. `startAt` moves the cursor, nothing else.

If no step carries that id, `run()` throws. That is deliberate: a stale id means the stored position no longer matches the workflow, and an onboarding that silently restarts from the beginning is a bug your users see. Catch it and decide — start over, skip the tour, or tell the user.

## Persisting the position

GlowTour.js ships no storage layer, on purpose. Storage is a policy: session or local, per tab or per account, with or without an expiry — every app wants it differently, and hardcoding `sessionStorage` in the core would also break server rendering. Your app owns those two lines:

```typescript
const KEY = "onboarding:step";

// Remember where the user is.
tour.state.subscribe((state) => {
  if (state.currentStep) sessionStorage.setItem(KEY, state.currentStep.id);
});

// Pick it back up.
const saved = sessionStorage.getItem(KEY) ?? undefined;
await tour.run(workflow, { startAt: saved });
```

Because your app is the only thing touching `sessionStorage`, this stays SSR-safe by construction — the core never reads a browser global. Swap `sessionStorage` for `localStorage`, a cookie, or a fetch to your backend for cross-device resume; nothing in the tour changes.

Clear the key on `onFinish` and `onCancel` so a completed tour does not resume itself.

## Navigation

Navigation stays with your router — GlowTour.js knows nothing about Next, vue-router, or `location.assign`. Two shapes cover the common cases.

**SPA, no reload.** The tour instance survives the route change, so nothing needs persisting. Navigate in `beforeAdvance` and let the next step wait for its target:

```typescript
.step({ id: "dashboard", target: "#kpi-card", title: "Dashboard", content: "..." })
.beforeAdvance(() => router.push("/profile"))
.step({
  id: "profile",
  target: "#profile-avatar",
  title: "Profile",
  content: "...",
  behavior: { missingTargetStrategy: "wait", targetTimeout: 5000 },
})
```

**Full reload.** The tour is destroyed, so save the id of the step you are navigating *to*, then resume on the next page:

```typescript
// Page A
.beforeAdvance(() => {
  sessionStorage.setItem(KEY, "settings");
  location.assign("/settings");
})

// Page B, after rebuilding the same workflow
const saved = sessionStorage.getItem(KEY);
if (saved) await tour.run(workflow, { startAt: saved });
```

`apps/playground/multipage` runs both scenarios end to end.

## Cases worth handling yourself

These are app decisions, so the core does not decide them for you:

- **The workflow changed** since the id was saved — `run()` throws; fall back to starting over, or store a version alongside the id.
- **The target no longer exists** on the resumed step — that is an ordinary missing-target case, handled by `behavior.missingTargetStrategy` — see [Handling errors](/docs/guides/handling-errors).
- **The user comes back days later** — add your own expiry when you write the key.
- **Two tabs** — the simplest workable rule is last-writer-wins; use a per-tab key if you need better.
