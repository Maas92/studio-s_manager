import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Heading from "./components/Heading";
import Button from "./components/Button";

const Wrap = styled.div`
  min-height: calc(100dvh - 64px);
  display: grid;
  place-items: center;
  padding: 24px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.text};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowMd};
  padding: 28px;
  width: min(720px, 100%);
  text-align: center;
`;

const Sub = styled.p`
  margin: 8px 0 16px;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Wrap>
      <Card>
        <Heading level="h1">Page not found</Heading>
        <Sub>The page you’re looking for doesn’t exist or has moved.</Sub>
        <Actions>
          <Button onClick={() => navigate(-1)} variation="secondary">
            Go back
          </Button>
          <Link to="/">
            <Button>Go to dashboard</Button>
          </Link>
        </Actions>
      </Card>
    </Wrap>
  );
}
