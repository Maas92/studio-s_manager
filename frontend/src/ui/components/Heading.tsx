import styled from "styled-components";

const sizes = { h1: "28px", h2: "22px", h3: "18px" } as const;
type Level = keyof typeof sizes;

type Props = React.HTMLAttributes<HTMLHeadingElement> & {
  level?: Level;
  as?: Level; // allow <H as="h3" /> usage
};

const StyledHeading = styled.h2<{ $level: Level }>`
  font-size: ${({ $level }) => sizes[$level]};
  font-weight: 800;
  color: ${({ theme }) => theme.color.grey900};
  margin-bottom: 12px;
`;

export default function Heading({ level, as, children, ...rest }: Props) {
  const resolved: Level = (level ?? as ?? "h2") as Level;
  return (
    <StyledHeading as={as ?? resolved} $level={resolved} {...rest}>
      {children}
    </StyledHeading>
  );
}
