import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_BASE_HREF } from "@angular/common";
import { CommonEngine } from "@angular/ssr";
import express from "express";
import bootstrap from "./src/main.server";

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, "../browser");
const indexHtml = join(serverDistFolder, "index.server.html");
const commonEngine = new CommonEngine();
const server = express();

// Static files only: `index: false` keeps "/" from being answered with the client-only shell,
// so every page request goes through the server renderer below.
server.get("*.*", express.static(browserDistFolder, { maxAge: "1y", index: false }));

server.get("*", (request, response, next) => {
  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${request.protocol}://${request.headers.host}${request.originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: request.baseUrl }],
    })
    .then((html) => response.send(html))
    .catch(next);
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`Angular SSR harness listening on http://localhost:${port}`);
});
