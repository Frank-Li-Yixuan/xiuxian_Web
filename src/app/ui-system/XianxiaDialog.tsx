import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";

export interface XianxiaDialogProps {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open: boolean;
  readonly title: ReactNode;
  readonly tone?: "calm" | "danger";
}

export function XianxiaDialog({
  actions,
  children,
  className,
  description,
  onOpenChange,
  open,
  title,
  tone = "calm"
}: XianxiaDialogProps): ReactElement {
  return (
    <Dialog.Root open={open} {...(onOpenChange === undefined ? {} : { onOpenChange })}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay asChild forceMount>
          <motion.div
            className={cn("xianxia-dialog-overlay", !open && "is-hidden")}
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.18 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount>
          <div aria-hidden={!open} className={cn("xianxia-dialog-positioner", !open && "is-hidden")}>
            <motion.section
              className={cn("xianxia-dialog", `xianxia-dialog-${tone}`, className)}
              initial={false}
              animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.96, y: open ? 0 : 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <span className="xianxia-dialog-formation" aria-hidden="true" />
              <Dialog.Title className="xianxia-dialog-title">{title}</Dialog.Title>
              {description === undefined ? null : <Dialog.Description className="xianxia-dialog-description">{description}</Dialog.Description>}
              <div className="xianxia-dialog-body">{children}</div>
              {actions === undefined ? null : <div className="xianxia-dialog-actions">{actions}</div>}
            </motion.section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
