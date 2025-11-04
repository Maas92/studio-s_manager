import styled from "styled-components";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.color.grey0};
  border: 1px solid ${({ theme }) => theme.color.grey200};
  border-radius: 12px;
  overflow: hidden;
  thead {
    background: ${({ theme }) => theme.color.grey100};
  }
  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid ${({ theme }) => theme.color.grey200};
    text-align: left;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
`;
export default Table;
