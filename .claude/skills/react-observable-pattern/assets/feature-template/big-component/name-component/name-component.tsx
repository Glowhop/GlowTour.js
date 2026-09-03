import { useValue } from "glowhop/react-observables";

import { useBigContext } from "../provider";

export default function NameComponent() {
  const { name } = useBigContext();

  const nameValue = useValue(name);
  const count = useValue(name, (value) => value.length);

  return (
    <div>
      <input
        value={nameValue}
        onChange={(event) => name.set(event.target.value)}
      />
      <p>{count}/10</p>
    </div>
  );
}
