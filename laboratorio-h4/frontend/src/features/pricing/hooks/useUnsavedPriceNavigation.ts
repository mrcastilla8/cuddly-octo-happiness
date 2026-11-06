import { useBeforeUnload, useBlocker } from "react-router-dom";

export function useUnsavedPriceNavigation(dirty: boolean, busy: boolean) {
  const blocker = useBlocker(dirty || busy);
  useBeforeUnload((event) => {
    if (dirty || busy) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  return blocker;
}
