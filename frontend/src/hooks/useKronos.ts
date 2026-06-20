import { useContext } from "react";
import { KronosContext } from "../context/KronosProvider";
import type { KronosState } from "../types/kronos";

export function useKronos(): KronosState {
  const state = useContext(KronosContext);
  if (!state) {
    throw new Error("useKronos must be used within a KronosProvider");
  }
  return state;
}
