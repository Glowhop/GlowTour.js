import { type ApplicationConfig, mergeApplicationConfig } from "@angular/core";
import { provideServerRendering } from "@angular/platform-server";
import { appConfig } from "./app.config";

export const config: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering()],
});
