<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: GlowTourDefault is used in the template.
import { GlowTourDefault, useGlowTour } from "@glowhop/vue-tour";
import { useTemplateRef } from "vue";

// biome-ignore lint/correctness/useHookAtTopLevel: Vue composables run in script setup.
const saveButton = useTemplateRef<HTMLButtonElement>("saveButton");
// biome-ignore lint/correctness/noUnusedVariables: used in the template.
const { tour, create, run, cancel, status, canCancel, currentStepIndex, totalSteps } =
  // biome-ignore lint/correctness/useHookAtTopLevel: Vue composables run in script setup.
  useGlowTour();

// biome-ignore lint/correctness/noUnusedVariables: used in the template.
const workflow = create("vue-use-glow-tour")
  .step({
    id: "profile",
    target: '[data-tour="profile"]',
    title: "Your profile",
    content: "This step targets a data-tour attribute.",
  })
  .step({
    id: "save",
    target: () => saveButton.value,
    title: "Save",
    content: "This step targets a template ref through a function.",
  })
  .step({
    id: "help",
    target: '[data-tour="help"]',
    title: "Help",
    content: "The status bar above updates from useGlowTour, outside the tour root.",
  })
  .build();
</script>

<template>
  <main class="tutorial">
    <h1>Vue · useGlowTour</h1>
    <p class="tutorial-lead">State fields are readonly refs.</p>
    <section class="tutorial-status" aria-label="Tour state">
      <output data-testid="tour-status">
        {{ status }}{{ status === 'active' ? ` · step ${currentStepIndex + 1} / ${totalSteps}` : "" }}
      </output>
      <div class="tutorial-actions">
        <button type="button" @click="run(workflow)">
          Start tutorial
        </button>
        <button type="button" :disabled="!canCancel" @click="cancel()">Cancel</button>
      </div>
    </section>
    <div class="tutorial-cards">
      <article class="tutorial-card" data-tour="profile">
        <h2>Profile</h2>
        <p>Name, avatar, and preferences.</p>
        <small>target: '[data-tour="profile"]'</small>
      </article>
      <article class="tutorial-card">
        <h2>Settings</h2>
        <button ref="saveButton" type="button">Save changes</button>
        <small>target: () =&gt; saveButton.value</small>
      </article>
      <article class="tutorial-card" data-tour="help">
        <h2>Help</h2>
        <p>Guides and support.</p>
        <small>target: '[data-tour="help"]'</small>
      </article>
    </div>
    <GlowTourDefault :tour="tour" />
  </main>
</template>
