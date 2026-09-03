import { createContext, useContext, useMemo, type ReactNode } from "react";

// Example import paths. Adjust to the installed package entrypoints if needed.
import {
  Observable,
  ObservableList,
  ObservableMap,
} from "glowhop/observables";

type ID = string;

interface BigContextType {
  name: Observable<string>;
  data: ObservableMap<ID, number>;
  ids: ObservableList<ID>;
}

const BigContext = createContext<BigContextType | null>(null);

export function useBigContext() {
  const context = useContext(BigContext);

  if (!context) {
    throw new Error("BigContext provider is missing");
  }

  return context;
}

interface Props {
  children: ReactNode;
}

export default function Provider({ children }: Props) {
  const value = useMemo(
    () => ({
      name: new Observable(""),
      data: new ObservableMap<ID, number>(new Map()),
      ids: new ObservableList<ID>([]),
    }),
    [],
  );

  return <BigContext.Provider value={value}>{children}</BigContext.Provider>;
}
