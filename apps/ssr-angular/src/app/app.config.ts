import { type ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  // Non-destructive hydration: the client reuses the server DOM and fails loudly on a mismatch,
  // which is exactly what this harness is here to catch.
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideClientHydration()],
};
