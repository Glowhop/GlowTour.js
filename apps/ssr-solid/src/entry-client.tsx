/** @jsxImportSource solid-js */
// @refresh reload

import { mount, StartClient } from "@solidjs/start/client";

const appRoot = document.getElementById("app");
if (!appRoot) {
  throw new Error("Missing #app root element for SolidStart client entry");
}
mount(() => <StartClient />, appRoot);
