import styled from "styled-components";

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.color.grey300};
  background: ${({ theme }) => theme.color.grey0};
  color: ${({ theme }) => theme.color.grey900};
  &:focus {
    outline: 3px solid ${({ theme }) => theme.color.brand100};
  }
`;
export default Input;
