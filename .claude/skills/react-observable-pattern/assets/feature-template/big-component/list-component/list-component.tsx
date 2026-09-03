import { useValue } from "glowhop/react-observables";

import { useBigContext } from "../provider";
import Item from "./components/item";

export default function ListComponent() {
  const { ids } = useBigContext();
  const order = useValue(ids);

  return (
    <div>
      {order.map((id) => (
        <Item key={id} itemId={id} />
      ))}
    </div>
  );
}
