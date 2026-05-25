import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";

const xianxiaButtonClass = cva("xianxia-button", {
  variants: {
    variant: {
      primary: "xianxia-button-primary",
      secondary: "xianxia-button-secondary",
      danger: "xianxia-button-danger",
      ghost: "xianxia-button-ghost"
    }
  },
  defaultVariants: {
    variant: "primary"
  }
});

export type XianxiaButtonVariant = NonNullable<VariantProps<typeof xianxiaButtonClass>["variant"]>;

export interface XianxiaButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  readonly children: ReactNode;
  readonly variant?: XianxiaButtonVariant;
}

export function XianxiaButton({ children, className, disabled, type = "button", variant = "primary", ...rest }: XianxiaButtonProps): ReactElement {
  return (
    <motion.button
      className={cn(xianxiaButtonClass({ variant }), className)}
      disabled={disabled}
      type={type}
      {...(disabled ? {} : { whileHover: { y: -2, scale: 1.018 }, whileTap: { y: 0, scale: 0.992 } })}
      {...rest}
    >
      <span className="xianxia-button-shine" aria-hidden="true" />
      <span className="xianxia-button-label">{children}</span>
    </motion.button>
  );
}
