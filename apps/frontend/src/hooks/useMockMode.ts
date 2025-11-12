import { createContext, useContext } from "react";

const MockModeContext = createContext(false);

export const MockModeProvider = MockModeContext.Provider;

export function useMockMode(): boolean {
  return useContext(MockModeContext);
}
