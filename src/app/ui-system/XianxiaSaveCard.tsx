import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";

export interface XianxiaSaveCardProps extends Omit<HTMLMotionProps<"button">, "children"> {
  readonly characterName?: ReactNode;
  readonly cultivation?: ReactNode;
  readonly empty?: boolean;
  readonly progress?: ReactNode;
  readonly saveName?: ReactNode;
}

export function XianxiaSaveCard({
  characterName,
  className,
  cultivation,
  disabled,
  empty = false,
  progress,
  saveName,
  type = "button",
  ...rest
}: XianxiaSaveCardProps): ReactElement {
  return (
    <motion.button
      className={cn("xianxia-save-card", empty && "is-empty", !empty && "is-occupied", className)}
      disabled={disabled}
      type={type}
      {...(disabled ? {} : { whileHover: { y: -3, scale: 1.012 }, whileTap: { y: 0, scale: 0.996 } })}
      {...rest}
    >
      <span className="xianxia-save-card-ornament" aria-hidden="true" />
      <span className="xianxia-save-card-center">
        {empty ? (
          <>
            <strong>空存档</strong>
            <small>命簿未书，静候入道</small>
          </>
        ) : (
          <>
            <strong>{saveName}</strong>
            <small>{characterName}</small>
            {progress === undefined || progress === null ? null : <small>{progress}</small>}
            <small>{cultivation}</small>
          </>
        )}
      </span>
      <span className="xianxia-save-card-glow" aria-hidden="true" />
    </motion.button>
  );
}
