import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";

export interface XianxiaPanelProps extends Omit<HTMLMotionProps<"section">, "children"> {
  readonly children: ReactNode;
  readonly tone?: "calm" | "ceremonial" | "danger";
}

export function XianxiaPanel({ children, className, tone = "calm", ...rest }: XianxiaPanelProps): ReactElement {
  return (
    <motion.section className={cn("xianxia-panel", `xianxia-panel-${tone}`, className)} {...rest}>
      <span className="xianxia-panel-corner xianxia-panel-corner-tl" aria-hidden="true" />
      <span className="xianxia-panel-corner xianxia-panel-corner-tr" aria-hidden="true" />
      <span className="xianxia-panel-corner xianxia-panel-corner-bl" aria-hidden="true" />
      <span className="xianxia-panel-corner xianxia-panel-corner-br" aria-hidden="true" />
      <span className="xianxia-panel-sigil" aria-hidden="true" />
      <div className="xianxia-panel-content">{children}</div>
    </motion.section>
  );
}
