import styled from "styled-components";

export const Form = styled.form`
  display: grid;
  gap: 12px;
  align-content: start;
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: center;
  label {
    color: ${({ theme }) => theme.color.grey700};
    font-weight: 600;
  }
`;
