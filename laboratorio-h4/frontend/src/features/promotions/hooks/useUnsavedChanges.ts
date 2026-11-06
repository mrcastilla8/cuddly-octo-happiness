import { useCallback, useLayoutEffect, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

export function useUnsavedChanges(
  dirty: boolean,
  submitting: boolean,
  editorPath?: string,
) {
  const allowed = useRef(false);
  useLayoutEffect(() => {
    allowed.current = !(dirty || submitting);
  }, [dirty, submitting]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowed.current &&
      (dirty || submitting) &&
      currentLocation.pathname !== nextLocation.pathname &&
      !(
        editorPath &&
        (nextLocation.pathname === editorPath ||
          nextLocation.pathname.startsWith(`${editorPath}/`))
      ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!allowed.current && (dirty || submitting)) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty, submitting],
    ),
  );
  return {
    blocked: blocker.state === "blocked",
    stay: () => {
      if (blocker.state === "blocked") blocker.reset();
    },
    discard: () => {
      if (!submitting && blocker.state === "blocked") blocker.proceed();
    },
  };
}
