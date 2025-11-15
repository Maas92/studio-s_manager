import React from "react";
import styled, { css } from "styled-components";

export type ButtonVariation = "primary" | "secondary" | "danger";
export type ButtonSize = "small" | "medium" | "large";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variation?: ButtonVariation;
  size?: ButtonSize;
};

const variations = {
  primary: css`
    background: ${({ theme }) => theme.color.brand600};
    color: white;
    border: 1px solid ${({ theme }) => theme.color.brand600};
    &:hover {
      background: ${({ theme }) => theme.color.brand700};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.grey100};
    color: ${({ theme }) => theme.color.text};
    border: 1px solid ${({ theme }) => theme.color.border};
    &:hover {
      background: ${({ theme }) => theme.color.grey200};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.color.red600};
    color: white;
    border: 1px solid ${({ theme }) => theme.color.red600};
    &:hover {
      background: ${({ theme }) => theme.color.red500};
    }
  `,
};

const sizes = {
  small: css`
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
  `,
  medium: css`
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
  `,
  large: css`
    padding: 14px 18px;
    border-radius: 16px;
    font-size: 16px;
  `,
};

const Btn = styled.button<Props>`
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${({ theme }) => theme.shadowSm};
  ${(p) => variations[p.variation || "primary"]}
  ${(p) => sizes[p.size || "medium"]}
`;

const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { variation = "primary", size = "medium", ...rest },
  ref
) {
  return <Btn ref={ref} variation={variation} size={size} {...rest} />;
});

export default Button;
