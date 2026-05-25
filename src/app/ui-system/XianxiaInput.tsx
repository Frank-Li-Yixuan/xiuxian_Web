import type { ChangeEvent, InputHTMLAttributes, ReactElement } from "react";

import { cn } from "./cn";

export interface XianxiaInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  readonly label: string;
  readonly onValueChange?: (value: string) => void;
}

export function XianxiaInput({ className, label, onValueChange, ...rest }: XianxiaInputProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onValueChange?.(event.currentTarget.value);
  };

  return (
    <label className={cn("xianxia-input-field", className)}>
      <span>{label}</span>
      <input {...rest} onChange={handleChange} />
    </label>
  );
}
