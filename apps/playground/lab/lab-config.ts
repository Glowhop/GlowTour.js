import type { StartOptions } from "@glowhop/core-tour";

export const LAB_CONFIG = {
  workflow: {
    name: "api-lab",
    appendedName: "api-lab-appended",
    options: {
      cancellable: true,
      allowScroll: true,
      animated: true,
      overlay: {},
      popover: {},
      indicator: {},
      behavior: {},
    } satisfies StartOptions<unknown>,
  },
  selectors: {
    start: "#api-lab-start",
    focusInput: "#api-lab-focus-input",
    revealButton: "#api-lab-reveal-button",
    revealed: "#api-lab-revealed",
    condition: "#api-lab-condition",
    actions: "#api-lab-actions",
    eventField: "#api-lab-event-field",
    clickAdvance: "#api-lab-click-advance",
    return: "#api-lab-return",
    previous: "#api-lab-previous",
    autoAdvance: "#api-lab-auto-advance",
    relocate: "#api-lab-relocate",
    nomad: "#api-lab-nomad",
    relocateDelay: "#api-lab-relocate-delay",
    customEvent: "#api-lab-custom-event",
  },
  timing: {
    conditionDelay: 650,
    focusWait: 80,
    resolverWait: 5000,
    conditionAdvanceWait: 500,
    previousWait: 650,
    autoAdvanceWait: 650,
    pollingInterval: 25,
    elementPollingInterval: 20,
    targetTimeout: 10_000,
    /**
     * How long the nomad target stays out of the DOM. Adjustable at runtime:
     * below the core's freeze grace the move is seamless, above
     * `targetTimeout` the "wait" strategy gives up and the tour errors.
     */
    relocateDelay: 1_200,
    relocateDelayMin: 0,
    relocateDelayMax: 12_000,
    relocateDelayStep: 100,
  },
  event: {
    completion: "api-lab:complete",
  },
  copy: {
    heading: "Builder API Lab",
    description: "Un parcours exécutable couvrant chaque API du builder GlowTour.js.",
    targetsHeading: "Cibles du parcours",
    targetsSummary: "13 étapes · 17 méthodes",
    intro: "Le workflow démarre avec ses options globales et une cible par sélecteur CSS.",
    focus: "La cible est un HTMLElement transmis directement. Le champ reçoit le focus.",
    focused: "Focus appliqué. Cette phrase a été injectée via context.props.",
    reveal: "Le builder clique la cible, puis attend que l’interface rende le résultat.",
    resolver: "Cette cible est résolue par une fonction asynchrone après une pause déclarative.",
    condition: "Une condition applicative devient vraie, puis l’étape avance automatiquement.",
    actions:
      "La première action continue la chaîne. La seconde l’arrête avant l’action sentinelle.",
    eventField: "Survolez le champ ou appuyez sur une touche, puis continuez.",
    clickAdvance: "Le bouton Suivant est masqué. Cliquez directement sur la cible pour avancer.",
    automaticReturn:
      "Continuez. Cette étape saura vous renvoyer automatiquement après la démonstration suivante.",
    previous: "Premier passage : retour automatique. Second passage : la garde stoppe la boucle.",
    autoAdvance: "La navigation finale est automatique et le footer est masqué.",
    relocate:
      "La cible quitte le DOM puis réapparaît ailleurs. La présentation reste figée pendant l’absence, puis rejoint la nouvelle position sans réapparition.",
    relocateDelayLabel: "Délai de réapparition",
    relocateAway: "Zone d’accueil",
    relocateHint:
      "Sous 150 ms le gel est invisible. Au-delà du targetTimeout, la stratégie wait abandonne.",
    appended:
      "Cette étape vient d’un autre workflow. Déclenchez l’événement personnalisé pour finir.",
  },
} as const;
