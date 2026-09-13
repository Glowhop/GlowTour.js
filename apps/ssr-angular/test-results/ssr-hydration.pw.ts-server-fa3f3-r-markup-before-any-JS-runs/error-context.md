# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ssr-hydration.pw.ts >> server renders target/trigger and tour markup before any JS runs
- Location: tests/ssr-hydration.pw.ts:3:1

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /\sngh="\d+"/
Received string:  "<!DOCTYPE html><html lang=\"en\" data-critters-container><head>
    <meta charset=\"utf-8\">
    <title>GlowTour.js - SSR Angular verification harness</title>
    <base href=\"/\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <style>@media (prefers-color-scheme: dark){:where(:root:not([data-glow-tour-theme=light])){color-scheme:dark;--glow-tour-color-accent: #6d5bff;--glow-tour-color-accent-active: #4f3ce0;--glow-tour-color-accent-hover: #5d4bf0;--glow-tour-color-border: #3a3a44;--glow-tour-color-on-accent: #ffffff;--glow-tour-color-surface: #1c1c21;--glow-tour-color-surface-muted: #26262d;--glow-tour-color-text: #f2f2f4;--glow-tour-color-text-muted: #a8a8b3;--glow-tour-shadow: 0 8px 24px rgb(0 0 0 / 56%)}}:where([data-glow-tour-root]) [data-glow-tour-popover],:where([data-glow-tour-root]) [data-glow-tour-popover] *,:where([data-glow-tour-root]) [data-glow-tour-pointer],:where([data-glow-tour-root]) [data-glow-tour-pointer] *{box-sizing:border-box}:where([data-glow-tour-root]) [data-glow-tour-overlay]{display:block;overflow:visible}:where([data-glow-tour-root]) [data-glow-tour-overlay] path{fill:var(--glow-tour-overlay-color, #000000)}:where([data-glow-tour-root]) [data-glow-tour-popover]{background:var(--glow-tour-color-surface, #ffffff);border:1px solid var(--glow-tour-color-border, #dedee3);border-radius:var(--glow-tour-radius, 8px);box-shadow:var(--glow-tour-shadow, 0 4px 12px rgb(0 0 0 / 8%));color:var(--glow-tour-color-text, #1f1f23);display:grid;font:inherit;gap:calc(var(--glow-tour-spacing, 8px) * 1.5);grid-template-rows:auto minmax(0,1fr) auto;max-height:calc(100dvh - (var(--glow-tour-viewport-gap, 16px) * 2));max-width:calc(100vw - (var(--glow-tour-viewport-gap, 16px) * 2));overflow:visible;overflow-wrap:anywhere;padding:calc(var(--glow-tour-spacing, 8px) * 2);width:min(var(--glow-tour-popover-width, 352px),calc(100vw - (var(--glow-tour-viewport-gap, 16px) * 2)))}:where([data-glow-tour-root]) [data-glow-tour-popover]:focus-visible{outline:3px solid var(--glow-tour-color-accent, #4c35fd);outline-offset:3px}:where([data-glow-tour-root]) [data-glow-tour-header]{color:var(--glow-tour-color-text, #1f1f23);font-size:1rem;font-weight:600;line-height:1.4}:where([data-glow-tour-root]) [data-glow-tour-content]{color:var(--glow-tour-color-text-muted, #5f5f66);font-size:.875rem;line-height:1.5;min-height:0;overflow-y:auto;overscroll-behavior:contain}:where([data-glow-tour-root]) [data-glow-tour-footer]{align-items:center;display:flex;gap:var(--glow-tour-spacing, 8px);justify-content:flex-end}:where([data-glow-tour-root]) [data-glow-tour-footer]>glow-tour-cancel-trigger{margin-inline-end:auto}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger],:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]{align-items:center;border:1px solid transparent;border-radius:var(--glow-tour-radius, 8px);cursor:pointer;display:inline-flex;font:inherit;font-size:.75rem;font-weight:600;justify-content:center;min-height:var(--glow-tour-control-height, 32px);padding:0 var(--glow-tour-spacing, 8px);transition:background-color var(--glow-tour-transition-duration, .12s) var(--glow-tour-transition-easing, ease-out),border-color var(--glow-tour-transition-duration, .12s) var(--glow-tour-transition-easing, ease-out),color var(--glow-tour-transition-duration, .12s) var(--glow-tour-transition-easing, ease-out)}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]{background:var(--glow-tour-color-surface, #ffffff);border-color:var(--glow-tour-color-border, #dedee3);color:var(--glow-tour-color-text, #1f1f23)}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]:hover:not(:disabled){background:var(--glow-tour-color-surface-muted, #f6f6f7);border-color:var(--glow-tour-color-text-muted, #5f5f66)}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]:active:not(:disabled){background:var(--glow-tour-color-surface, #ffffff);border-color:var(--glow-tour-color-text, #1f1f23)}:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]{background:var(--glow-tour-color-accent, #4c35fd);border-color:var(--glow-tour-color-accent, #4c35fd);color:var(--glow-tour-color-on-accent, #ffffff)}:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]:hover:not(:disabled){background:var(--glow-tour-color-accent-hover, #3f2be0);border-color:var(--glow-tour-color-accent-hover, #3f2be0)}:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]:active:not(:disabled){background:var(--glow-tour-color-accent-active, #3522c7);border-color:var(--glow-tour-color-accent-active, #3522c7)}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]:focus-visible,:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]:focus-visible{outline:3px solid var(--glow-tour-color-accent, #4c35fd);outline-offset:2px}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]:disabled,:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]:disabled{background:var(--glow-tour-color-surface-muted, #f6f6f7);border-color:var(--glow-tour-color-border, #dedee3);box-shadow:none;color:var(--glow-tour-color-text-muted, #5f5f66);cursor:not-allowed;opacity:.65}:where([data-glow-tour-root]) [data-glow-tour-pointer]{font-size:2rem;height:1em;line-height:1;position:relative;width:1em}:where([data-glow-tour-root]) [data-glow-tour-pointer-direction]{align-items:center;display:flex;inset:0;justify-content:center;position:absolute}@media (prefers-reduced-motion: reduce){:where([data-glow-tour-root]) [data-glow-tour-previous-trigger],:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]{transition-duration:.01ms}}@media (forced-colors: active){:where([data-glow-tour-root]) [data-glow-tour-previous-trigger],:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]{border-color:ButtonText;forced-color-adjust:auto}:where([data-glow-tour-root]) [data-glow-tour-previous-trigger]:focus-visible,:where([data-glow-tour-root]) [data-glow-tour-advance-trigger]:focus-visible{outline-color:Highlight}}
</style><link rel=\"stylesheet\" href=\"styles-SMS2ASKI.css\" media=\"print\" onload=\"this.media='all'\"><noscript><link rel=\"stylesheet\" href=\"styles-SMS2ASKI.css\"></noscript></head>
  <body>
    <app-root ng-version=\"18.2.13\" ng-server-context=\"ssr\"><div style=\"padding: 20px;\"><h1>GlowTour.js - SSR Angular verification harness</h1><p id=\"tour-target\">This is the tour target element.</p><button id=\"tour-trigger\" type=\"button\">Start tour</button></div><glow-tour-default><glow-tour-root data-glow-tour-root id=\"glow-tour-root\" data-glow-tour-id-prefix=\"glow-tour\"><glow-tour-overlay><svg data-glow-tour-overlay=\"\" focusable=\"false\" role=\"presentation\" viewBox=\"0 0 1024 768\" style=\"clip-rule: evenodd; fill-rule: evenodd; height: 100lvh; left: 0px; pointer-events: none; position: fixed; stroke-linejoin: round; stroke-miterlimit: 2; top: 0px; width: 100%; z-index: 10000;\" aria-hidden=\"true\" data-glow-tour-allow-interaction=\"false\" inert=\"true\" preserveAspectRatio=\"xMinYMin slice\"><path data-glow-tour-overlay-path=\"\" fill-rule=\"evenodd\" cursor=\"auto\" opacity=\"0\" pointer-events=\"auto\"/></svg></glow-tour-overlay><glow-tour-pointer><div data-glow-tour-pointer style=\"left: 0px; opacity: 0; pointer-events: none; position: fixed; top: 0px; will-change: top, left, transform, opacity; z-index: 10002;\" aria-hidden=\"true\"><div data-glow-tour-pointer-direction=\"top\"><!----> 👆 <!----></div><div data-glow-tour-pointer-direction=\"bottom\"><!----> 👇 <!----></div><div data-glow-tour-pointer-direction=\"left\"><!----> 👈 <!----></div><div data-glow-tour-pointer-direction=\"right\"><!----> 👉 <!----></div><!----></div></glow-tour-pointer><glow-tour-popover><section data-glow-tour-popover role=\"dialog\" tabindex=\"-1\" style=\"left: 0px; opacity: 0; position: fixed; top: 0px; transform-origin: center center; z-index: 10001;\" id=\"glow-tour-popover\" aria-hidden=\"true\" aria-describedby=\"glow-tour-description\" aria-labelledby=\"glow-tour-title\" inert=\"true\"><glow-tour-header><header data-glow-tour-header id=\"glow-tour-title\"><!---->  <!----></header></glow-tour-header><glow-tour-content><div aria-live=\"polite\" data-glow-tour-content id=\"glow-tour-description\"><!---->  <!----></div></glow-tour-content><glow-tour-footer><footer data-glow-tour-footer><glow-tour-cancel-trigger><!----></glow-tour-cancel-trigger><glow-tour-back-trigger><button data-glow-tour-previous-trigger type=\"button\" disabled aria-controls=\"glow-tour-popover\" aria-disabled=\"true\" aria-label=\"Back step\">Back step<!----></button><!----></glow-tour-back-trigger><glow-tour-advance-trigger><button data-glow-tour-advance-trigger type=\"button\" disabled aria-controls=\"glow-tour-popover\" aria-disabled=\"true\" aria-label=\"Advance step\">Advance step<!----></button><!----></glow-tour-advance-trigger></footer><!----></glow-tour-footer></section></glow-tour-popover></glow-tour-root></glow-tour-default></app-root>
  <script src=\"polyfills-XOXYJDD5.js\" type=\"module\"></script><script src=\"main-ITXXNTHN.js\" type=\"module\"></script>·
</body></html>"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("server renders target/trigger and tour markup before any JS runs", async ({ baseURL }) => {
  4  |   const response = await fetch(baseURL as string);
  5  |   expect(response.ok).toBe(true);
  6  | 
  7  |   const html = await response.text();
  8  |   expect(html).toContain('id="tour-target"');
  9  |   expect(html).toContain("This is the tour target element.");
  10 |   expect(html).toContain('id="tour-trigger"');
  11 |   expect(html).toContain("Start tour");
  12 | 
  13 |   // The default tour popover markup is always present, even before the tour starts.
  14 |   expect(html).toContain("data-glow-tour-popover");
  15 |   expect(html).toContain("data-glow-tour-advance-trigger");
  16 | 
  17 |   // `ngh` annotations are only emitted when client hydration is enabled: without them the
  18 |   // browser would re-render from scratch and a mismatch could never surface below.
  19 |   expect(html).toContain('ng-server-context="ssr"');
> 20 |   expect(html).toMatch(/\sngh="\d+"/);
     |                ^ Error: expect(received).toMatch(expected)
  21 | });
  22 | 
  23 | test("hydrates without console errors/warnings and the tour is interactive", async ({ page }) => {
  24 |   const consoleIssues: string[] = [];
  25 |   page.on("console", (message) => {
  26 |     if (message.type() === "error" || message.type() === "warning") {
  27 |       consoleIssues.push(`[${message.type()}] ${message.text()}`);
  28 |     }
  29 |   });
  30 |   page.on("pageerror", (error) => {
  31 |     consoleIssues.push(`[pageerror] ${error.message}`);
  32 |   });
  33 | 
  34 |   await page.goto("/");
  35 | 
  36 |   const trigger = page.locator("#tour-trigger");
  37 |   await expect(trigger).toBeVisible();
  38 |   await trigger.click();
  39 |   const popover = page.locator("[data-glow-tour-popover]");
  40 |   await expect(popover).toBeVisible();
  41 |   await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step one");
  42 | 
  43 |   const advanceButton = page.locator("[data-glow-tour-advance-trigger]");
  44 |   await advanceButton.click();
  45 |   await expect(page.locator("[data-glow-tour-header]")).toHaveText("Step two");
  46 | 
  47 |   // Finishing closes the tour: the popover leaves the accessibility tree.
  48 |   await advanceButton.click();
  49 |   await expect(popover).toHaveAttribute("aria-hidden", "true");
  50 |   await expect(popover).toHaveAttribute("inert");
  51 | 
  52 |   // Checked last so hydration has long finished: mismatches surface as NG05xx console errors.
  53 |   expect(consoleIssues, `Unexpected console issues:\n${consoleIssues.join("\n")}`).toEqual([]);
  54 | });
  55 | 
```