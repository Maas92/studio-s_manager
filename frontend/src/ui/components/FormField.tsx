import styled from "styled-components";
import Input from "./Input";

interface FormFieldProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
  step?: string;
  min?: string | number;
  max?: string | number;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.color.red500};
  margin-left: 4px;
`;

const ReadOnlyField = styled.div`
  padding: 0.8rem 1.2rem;
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export default function FormField({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
  readOnly = false,
  icon,
  step,
  min,
  max,
}: FormFieldProps) {
  return (
    <Container>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredIndicator>*</RequiredIndicator>}
      </Label>
      {readOnly ? (
        <ReadOnlyField>
          {icon}
          {value || "Not provided"}
        </ReadOnlyField>
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
        />
      )}
    </Container>
  );
}
