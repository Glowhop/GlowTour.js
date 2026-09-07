# JSON-serializable tour config

`createWorkflowFromConfig` turns a plain JSON configuration into the same `WorkflowDefinition` produced by the JavaScript builder. Tours can therefore be authored in a CMS, stored in a database, or served by an API without changing how GlowTour renders or runs them.

The config API ships as a separate entry point, so applications using only the builder do not pay for it.

## Quick start

Import the config entry point for your framework, load a JSON object, then run the generated workflow:

```typescript
import { createGlowTour } from "@glowhop/react-tour";
import { createWorkflowFromConfig } from "@glowhop/react-tour/config";

const config = await fetch("/tours/onboarding.json").then((response) => response.json());
const workflow = createWorkflowFromConfig(config);

await createGlowTour().run(workflow);
```

`createWorkflowFromConfig` accepts `unknown`, validates the complete configuration, and throws a `ConfigValidationError` before building when anything is invalid.

## Configuration format

```jsonc
{
  "name": "onboarding",
  "cancellable": true,
  "overlay": { "opacity": 0.55 },
  "popover": { "gap": 16 },
  "steps": [
    {
      "target": "#invite-button",
      "title": "Invite your team",
      "content": "Send an invite to get started.",
      "data": { "trackingId": "invite-step" },
      "actions": [
        { "type": "waitUntilElement", "selector": "#invite-button", "timeout": 5000 },
        { "type": "clickTarget" }
      ],
      "eventHandlers": [
        { "event": "click", "action": { "type": "focusTarget" } }
      ]
    },
    {
      "target": "#done-banner",
      "title": "All set!",
      "content": "You're ready to go.",
      "actions": [{ "type": "wait", "ms": 400 }]
    }
  ]
}
```

- `name` and `steps` are required.
- Every step requires `target`, `title`, and `content`.
- `target` is a CSS selector. Function and `HTMLElement` targets remain builder-only.
- `title` and `content` are strings for JSON loaded from a CMS or API.
- `overlay`, `popover`, `indicator`, and `behavior` use the same options as the builder, globally or per step.
- `data` accepts `string`, `number`, `boolean`, and `null` values.

Unknown keys, invalid nested options, and unsupported values are rejected rather than silently ignored.

### Authoring JSON with TypeScript

Use `WorkflowConfig` while authoring a JSON payload to get autocomplete and catch structural errors in the editor:

```typescript
import type { WorkflowConfig } from "@glowhop/react-tour/config";

const config: WorkflowConfig = {
  name: "onboarding",
  steps: [
    {
      target: "#invite-button",
      title: "Invite your team",
      content: "Send an invite to get started.",
      actions: [
        { type: "waitUntilElement", selector: "#invite-button" },
        { type: "clickTarget" },
      ],
    },
  ],
};

const json = JSON.stringify(config, null, 2);
```

Keep this object declarative when it must be transported as JSON. `WorkflowConfig` also accepts same-runtime JavaScript callbacks, but functions are not preserved by `JSON.stringify`.

### Built-in actions

`actions[]` and `eventHandlers[].action` accept declarative action objects:

| `type` | Fields | Builder equivalent |
| --- | --- | --- |
| `"wait"` | `ms: number` | `.wait(ms)` |
| `"waitUntilElement"` | `selector: string`, `interval?: number`, `timeout?: number` | `.waitUntilElement(...)` |
| `"clickTarget"` | — | `.clickTarget()` |
| `"focusTarget"` | — | `.focusTarget()` |

`.waitUntil(predicate)` has no JSON equivalent because an arbitrary predicate cannot be serialized. Use `waitUntilElement` or the JavaScript builder instead.

## Validation errors

All problems are reported together with their path:

```typescript
import { ConfigValidationError } from "@glowhop/react-tour/config";

try {
  createWorkflowFromConfig(config);
} catch (error) {
  if (error instanceof ConfigValidationError) {
    for (const issue of error.issues) {
      console.error(`${issue.path}: ${issue.message}`);
    }
  }
}
```

This makes CMS payloads and generated configuration easier to diagnose in one pass.

## Adding JavaScript behavior

Plain JSON covers targets, presentation options, data, and built-in actions. Same-runtime configuration objects can additionally contain functions, but they can no longer be transported as JSON.

`actions[]` and `eventHandlers[].action` accept an inline function:

```typescript
import type { WorkflowConfig } from "@glowhop/react-tour/config";

const config: WorkflowConfig = {
  name: "onboarding",
  steps: [
    {
      target: "#invite-button",
      title: "Invite your team",
      content: "Send an invite to get started.",
      actions: [
        { type: "waitUntilElement", selector: "#invite-button" },
        async (context) => {
          await analytics.track("invite_step_shown", { target: context.target.id });
        },
      ],
    },
  ],
};

const workflow = createWorkflowFromConfig(config);
```

`advanceAction`, `previousAction`, and `cancelAction`, plus `onStart`, `onCancel`, and `onFinish`, accept only functions. Built-in actions cannot run in those contexts.

For CMS-driven behavior, keep an identifier in `data` and attach the implementation in application code:

```typescript
const config = {
  ...parsed,
  steps: parsed.steps.map((step) => ({
    ...step,
    advanceAction: (context: BeforeActionStepContext<string>) => {
      analytics.track(String(context.data?.trackingId ?? "unknown-step"));
    },
  })),
};
```

## Entry points

Framework adapters expose pre-bound config entry points:

- `@glowhop/react-tour/config`
- `@glowhop/vue-tour/config`
- `@glowhop/solid-tour/config`
- `@glowhop/angular-tour/config`
- `@glowhop/vanilla-tour/config`

For direct core usage, import from `@glowhop/core-tour/config`:

```typescript
import { createGlowTour } from "@glowhop/core-tour";
import { createWorkflowFromConfig } from "@glowhop/core-tour/config";

const workflow = createWorkflowFromConfig(config);
await createGlowTour<string>().run(workflow);
```

Each entry point also exports the config types, `ConfigValidationError`, and `validateWorkflowConfig`.

## Rich framework content

The default validation requires string values because that is the safe format for JSON from a CMS or API. For a configuration object assembled inside the application, framework content such as a React node, Vue VNode, Angular `TemplateRef`, or DOM `Node` can be accepted with the optional `validateContent` callback:

```tsx
const workflow = createWorkflowFromConfig(
  {
    name: "onboarding",
    steps: [
      {
        target: "#invite-button",
        title: <b>Invite your team</b>,
        content: "Send an invite to get started.",
      },
    ],
  },
  {
    validateContent: (value) => (value === undefined ? "must not be undefined" : null),
  },
);
```

`validateContent(value, path)` returns an error message or `null`. Keep the default string validation for untrusted JSON.

## Security

The config module never evaluates strings as code: it uses no `eval`, `new Function`, or id-to-function registry. A payload produced by `JSON.parse()` cannot introduce executable functions.

## Limitations

- CSS selector targets only.
- No declarative conditions such as `showIf`.
- No config exporter yet; the generated definition retains its validated source in `.source`.
- No built-in i18n integration. Translation keys and interpolation values can be stored in `content` and `data`.

For the JavaScript builder equivalent, see the [Builder reference](/docs/reference/builder) and [Programmatic control guide](/docs/guides/programmatic-control).
