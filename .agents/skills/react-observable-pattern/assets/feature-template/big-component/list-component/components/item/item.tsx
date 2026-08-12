import { useEntry } from "glowhop/react-observables";

import { useBigContext } from "../../../provider";

interface Props {
  itemId: string;
}

export default function Item({ itemId }: Props) {
  const { data } = useBigContext();

  // Example signature. Adapt to the installed package version if needed.
  const itemValue = useEntry(data, itemId);

  const onUpdate = (value: number) => {
    data.setEntry(itemId, value);
  };

  return (
    <div>
      <span>{itemValue}</span>
      <button type="button" onClick={() => onUpdate((itemValue ?? 0) + 1)}>
        Increment
      </button>
    </div>
  );
}
