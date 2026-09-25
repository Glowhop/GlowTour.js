---
"@glowhop/core-tour": minor
"@glowhop/react-tour": patch
"@glowhop/vue-tour": patch
"@glowhop/solid-tour": patch
"@glowhop/angular-tour": patch
"@glowhop/vanilla-tour": patch
---

Step the popover aside while the user scrolls. The popover and the pointer used to chase the target through a fade every few pixels of travel, and settled in the middle of the screen once the target had scrolled out of view. They now fade out at the first scroll and come back once the page has been still for a moment, while the spotlight keeps following the target. When the user left part of the target outside the viewport, the step scrolls it back after the new `behavior.scroll.returnDelay` (2000 ms by default, `false` to leave the page where the user put it); scrolling again restarts the wait, and a wheel or touch drag during the scroll back hands the page back. Steps with `allowScroll: false` or `autoScroll: false` do not scroll back.
