import { useEffect, useRef, type ReactElement } from "react";

import { mountBrowserGameApp, type BrowserGameAppHandle } from "../BrowserGameApp";

export function CombatScreen(): ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const appHandleRef = useRef<BrowserGameAppHandle | null>(null);

  useEffect(() => {
    if (rootRef.current === null) {
      return;
    }
    appHandleRef.current = mountBrowserGameApp(rootRef.current);
    return () => {
      appHandleRef.current?.stop();
      appHandleRef.current = null;
    };
  }, []);

  return <section ref={rootRef} className="combat-screen" data-testid="combat-screen" />;
}
