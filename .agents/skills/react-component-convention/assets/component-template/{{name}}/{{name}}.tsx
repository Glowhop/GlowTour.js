import styles from "./{{name}}.module.css";
import type { {{pascalName}}Slots } from "./{{name}}.types";

import { {{subcomponentPascalName}} } from "./components/{{subcomponent-name}}";

interface Props {
  title: string;
  slots?: {{pascalName}}Slots;
}

export default function {{pascalName}}({ title, slots }: Props) {
  return (
    <section className={styles.root}>
      <{{subcomponentPascalName}} title={title} slots={slots} />
    </section>
  );
}
