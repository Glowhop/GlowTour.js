import type { JSX } from "solid-js";
import { GlowTourAdvanceTrigger } from "./components/tour-components";

declare const solidElement: JSX.Element;

// @ts-expect-error Solid elements cannot receive trigger props after creation.
GlowTourAdvanceTrigger({ children: solidElement });
