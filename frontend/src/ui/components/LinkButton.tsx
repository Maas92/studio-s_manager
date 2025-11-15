// components/ui/LinkButton.tsx
import React from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import Button, { type ButtonVariation, type ButtonSize } from "./Button";

/**
 * Visual button that is actually a NavLink for routing semantics.
 * It forwards refs to the underlying anchor.
 */
export type LinkButtonProps = Omit<NavLinkProps, "className"> & {
  variation?: ButtonVariation;
  size?: ButtonSize;
  icon?: React.ComponentType<{ size?: number }>;
  children?: React.ReactNode;
};

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton(
    {
      to,
      icon: Icon,
      variation = "secondary",
      size = "medium",
      children,
      ...navLinkProps
    },
    ref
  ) {
    // We render the styled Btn as NavLink so visual style is kept and NavLink handles active/className.
    return (
      <Button
        as={NavLink}
        to={to}
        ref={ref}
        variation={variation}
        size={size}
        // NavLink will set `.active` class automatically — you can style .active from outside.
        {...(navLinkProps as NavLinkProps)}
      >
        {Icon ? <Icon size={18} /> : null}
        <span>{children}</span>
      </Button>
    );
  }
);

export default LinkButton;
