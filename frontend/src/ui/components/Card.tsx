import React from "react";
import styled, { useTheme } from "styled-components";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  hoverable?: boolean;
};

const Wrapper = styled.div<{ $hoverable?: boolean }>`
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadowSm};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  /* Subtle gradient overlay for depth */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.color.brand200 || "#bfdbfe"}40,
      transparent
    );
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  ${({ $hoverable }) =>
    $hoverable &&
    `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.15),
                  0 0 0 1px rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      
      &::before {
        opacity: 1;
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.1);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2),
                  0 12px 24px -10px rgba(0, 0, 0, 0.15);
      border-color: rgba(99, 102, 241, 0.5);
    }
  `}
`;

const Card = React.forwardRef<HTMLDivElement, Props>(function Card(
  { children, className, style, hoverable = false, ...rest },
  ref
) {
  const theme = useTheme();
  void theme;

  return (
    <Wrapper
      ref={ref}
      className={className}
      style={style}
      $hoverable={hoverable}
      {...rest}
    >
      {children}
    </Wrapper>
  );
});

Card.displayName = "Card";

export default Card;
