// Not used right now because I don't understand how to implement
// styled-components theming is currently being used

import styled, { useTheme } from "styled-components";

const Card = ({ children, className = "", style = {} }) => {
  const { theme } = useTheme();
  return (
    <div
      className={className}
      style={{
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radii.lg,
        padding: "20px",
        boxShadow: theme.shadowMd,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;
