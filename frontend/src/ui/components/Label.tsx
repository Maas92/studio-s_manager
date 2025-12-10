import React from "react";
import clsx from "clsx";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

export default function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={clsx(
        "block text-sm font-medium text-[var(--text-secondary)] mb-1",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
