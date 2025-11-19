import React from "react";
import styled, { useTheme } from "styled-components";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const Wrapper = styled.div`
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px;
  box-shadow: ${({ theme }) => theme.shadowMd};
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const Card = React.forwardRef<HTMLDivElement, Props>(function Card(
  { children, className, style, ...rest },
  ref
) {
  // ensure theme usage so styled-components' theming type-checks correctly
  const theme = useTheme();
  void theme;

  return (
    <Wrapper ref={ref} className={className} style={style} {...rest}>
      {children}
    </Wrapper>
  );
});

Card.displayName = "Card";

export default Card;
