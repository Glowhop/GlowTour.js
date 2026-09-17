import { defineCollection } from "astro:content";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Starlight reads UI string overrides from here. `en.json` overrides nothing, but an empty
  // collection makes Astro warn on every build.
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
