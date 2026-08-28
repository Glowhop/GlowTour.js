import type { JSX } from "solid-js";
import { AdvanceTrigger } from "./components/tour-components";

declare const solidElement: JSX.Element;

// @ts-expect-error Solid elements cannot receive trigger props after creation.
AdvanceTrigger({ children: solidElement });
