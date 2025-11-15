// components/ui/ActionButton.tsx
import React from "react";
import Button, { type ButtonVariation, type ButtonSize } from "./Button";

export type ActionButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variation?: ButtonVariation;
    size?: ButtonSize;
    icon?: React.ComponentType<{ size?: number }>;
    children?: React.ReactNode;
  };

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton(
    {
      icon: Icon,
      variation = "secondary",
      size = "medium",
      children,
      ...btnProps
    },
    ref
  ) {
    return (
      <Button ref={ref} variation={variation} size={size} {...btnProps}>
        {Icon ? <Icon size={18} /> : null}
        <span>{children}</span>
      </Button>
    );
  }
);

export default ActionButton;
