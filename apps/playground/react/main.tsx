import "@glowhop/styles-tour/default.css";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import ApiLab from "./api-lab";

const root = document.querySelector("#react-root");
if (!root) {
  throw new Error("Missing #react-root");
}

createRoot(root).render(<ApiLab />);
