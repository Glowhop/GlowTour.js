/**
 * Renders the 1200x630 social cards (JPEG) in public/og/, one per marketing page plus one for the docs.
 *
 * The cards are committed rather than built on every deploy: they only change when a page's
 * headline does, and rendering them needs a browser that the site build should not depend on.
 * Run it after adding a page or changing a card's text:
 *
 *   bun run --cwd apps/website og
 */
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

interface Card {
  /** File name under public/og/, without the extension. */
  name: string;
  kicker: string;
  title: string;
  subtitle: string;
}

const CARDS: readonly Card[] = [
  {
    name: "home",
    kicker: "Open-source JavaScript library",
    title: "Product tours & onboarding tours",
    subtitle: "React, Vue, Angular, Solid and vanilla JS. Accessible, SSR-ready, MIT.",
  },
  {
    name: "react",
    kicker: "@glowhop/react-tour",
    title: "React product tour library",
    subtitle: "Onboarding tours for React 18/19 and Next.js, as native components.",
  },
  {
    name: "vue",
    kicker: "@glowhop/vue-tour",
    title: "Vue product tour library",
    subtitle: "Onboarding tours for Vue 3 and Nuxt, as native components.",
  },
  {
    name: "angular",
    kicker: "@glowhop/angular-tour",
    title: "Angular product tour library",
    subtitle: "Onboarding tours for Angular 18+, standalone components, SSR verified.",
  },
  {
    name: "solid",
    kicker: "@glowhop/solid-tour",
    title: "Solid product tour library",
    subtitle: "Onboarding tours for Solid and SolidStart, as native components.",
  },
  {
    name: "vanilla",
    kicker: "@glowhop/vanilla-tour",
    title: "JavaScript product tour library",
    subtitle: "Onboarding tours with native custom elements. No framework needed.",
  },
  {
    name: "examples",
    kicker: "Live demos with source",
    title: "Product tour examples",
    subtitle: "Onboarding flows, feature spotlights and step-by-step tours you can copy.",
  },
  {
    name: "compare",
    kicker: "Comparison",
    title: "The best open-source product tour libraries",
    subtitle: "GlowTour.js, Intro.js, Driver.js, Shepherd.js and React Joyride.",
  },
  {
    name: "vs-driver-js",
    kicker: "Driver.js alternative",
    title: "GlowTour.js vs Driver.js",
    subtitle: "Framework integration, customization, API and accessibility.",
  },
  {
    name: "vs-shepherd-js",
    kicker: "Shepherd.js alternative",
    title: "GlowTour.js vs Shepherd.js",
    subtitle: "Framework integration, customization, API and licensing.",
  },
  {
    name: "vs-react-joyride",
    kicker: "React Joyride alternative",
    title: "GlowTour.js vs React Joyride",
    subtitle: "React-only vs framework-agnostic, customization and SSR.",
  },
  {
    name: "vs-intro-js",
    kicker: "Intro.js alternative",
    title: "GlowTour.js vs Intro.js",
    subtitle: "MIT vs AGPL-3.0/commercial, framework support, SSR and accessibility.",
  },
  {
    name: "docs",
    kicker: "Documentation",
    title: "Build a product tour with GlowTour.js",
    subtitle: "Guides and API reference for React, Vue, Angular, Solid and vanilla JS.",
  },
];

const publicDir = new URL("../public/", import.meta.url);
const outDir = new URL("og/", publicDir);

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inlined as data URIs: a page set with setContent() is about:blank, which may not load file://.
const dataUri = async (path: string, type: string) =>
  `data:${type};base64,${(await readFile(new URL(path, publicDir))).toString("base64")}`;
const ASSETS: Record<string, string> = {
  "fonts/fraunces-latin.woff2": await dataUri("fonts/fraunces-latin.woff2", "font/woff2"),
  "glow-tour-logo.png": await dataUri("glow-tour-logo.png", "image/png"),
  "mascot-wizard.png": await dataUri("mascot-wizard.png", "image/png"),
};

function cardHtml(card: Card): string {
  const asset = (path: string) => ASSETS[path];
  return `<!doctype html>
<html><head><style>
  @font-face {
    font-family: "Fraunces";
    font-weight: 500 700;
    src: url("${asset("fonts/fraunces-latin.woff2")}") format("woff2");
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    background: radial-gradient(ellipse 60% 70% at 78% 40%, rgb(76 53 253 / 45%), transparent 70%), #0b0a10;
    color: #f4f3f8;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .brand { position: absolute; top: 56px; left: 72px; display: flex; align-items: center; gap: 14px;
    font-family: "Fraunces", serif; font-variation-settings: "SOFT" 40, "WONK" 1; font-weight: 600; font-size: 34px; }
  .brand img { width: 52px; height: 44px; object-fit: contain; }
  .brand b { color: #9d8dff; font-weight: 600; }
  .text { position: absolute; left: 72px; top: 170px; width: 700px; }
  .kicker { color: #d9a327; font-size: 26px; font-weight: 600; letter-spacing: 0.01em; }
  h1 { margin-top: 18px; font-family: "Fraunces", serif; font-variation-settings: "SOFT" 40, "WONK" 1;
    font-weight: 650; font-size: 68px; line-height: 1.05; letter-spacing: -0.02em; }
  p { margin-top: 26px; color: #b9b7c6; font-size: 28px; line-height: 1.35; }
  .mascot { position: absolute; right: -40px; bottom: 40px; width: 470px; }
  .url { position: absolute; left: 72px; bottom: 50px; color: #8f8c9e; font-size: 24px; }
</style></head><body>
  <div class="brand"><img src="${asset("glow-tour-logo.png")}" alt=""><span><b>Glow</b>Tour.js</span></div>
  <div class="text">
    <div class="kicker">${escapeHtml(card.kicker)}</div>
    <h1>${escapeHtml(card.title)}</h1>
    <p>${escapeHtml(card.subtitle)}</p>
  </div>
  <img class="mascot" src="${asset("mascot-wizard.png")}" alt="">
  <div class="url">glowtour.dev</div>
</body></html>`;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const card of CARDS) {
  await page.setContent(cardHtml(card), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL(`${card.name}.jpg`, outDir).pathname,
    type: "jpeg",
    quality: 88,
  });
  console.log(`og/${card.name}.jpg`);
}
await browser.close();
