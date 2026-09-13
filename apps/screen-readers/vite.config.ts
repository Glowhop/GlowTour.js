import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    react({ include: /\/adapters\/react\.tsx$/ }),
    solid({ include: /\/adapters\/solid\.tsx$/ }),
  ],
});
