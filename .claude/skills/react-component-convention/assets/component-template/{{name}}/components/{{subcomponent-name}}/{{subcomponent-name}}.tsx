import type { {{pascalName}}Slots } from "../../{{name}}.types";

interface Props {
  title: string;
  slots?: {{pascalName}}Slots;
}

export function {{subcomponentPascalName}}({ title, slots }: Props) {
  return <div>{slots?.title ?? title}</div>;
}
