import React from "react";
import styled from "styled-components";
import { Check } from "lucide-react";

interface Step {
  number: number;
  label: string;
  completed: boolean;
}

interface POSStepWrapperProps {
  currentStep: number;
  steps: Step[];
  children: React.ReactNode;
}

const Wrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const StepsHeader = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: ${({ theme }) => theme.shadowMd};
`;

const StepsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  max-width: 800px;
  margin: 0 auto;
`;

const StepItem = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 2;
`;

const StepCircle = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.125rem;
  background: ${({ $active, $completed, theme }) =>
    $completed
      ? theme.color.green500
      : $active
      ? theme.color.brand500
      : theme.color.grey200};
  color: ${({ $active, $completed }) =>
    $completed || $active ? "#ffffff" : "#6b7280"};
  border: 3px solid
    ${({ $active, $completed, theme }) =>
      $completed
        ? theme.color.green500
        : $active
        ? theme.color.brand600
        : theme.color.grey300};
  transition: all 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadowMd};
`;

const StepLabel = styled.div<{ $active: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, theme }) =>
    $active ? theme.color.text : theme.color.mutedText};
  text-align: center;
  max-width: 100px;
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  position: absolute;
  top: 1.75rem;
  left: 0;
  right: 0;
  height: 3px;
  background: ${({ $completed, theme }) =>
    $completed ? theme.color.green500 : theme.color.grey300};
  z-index: 1;
  transition: background 0.3s ease;
`;

const Content = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadowMd};
  min-height: 600px;
`;

export default function POSStepWrapper({
  currentStep,
  steps,
  children,
}: POSStepWrapperProps) {
  return (
    <Wrapper>
      <StepsHeader>
        <StepsContainer>
          <StepConnector
            $completed={currentStep > 1}
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
          {steps.map((step) => (
            <StepItem
              key={step.number}
              $active={currentStep === step.number}
              $completed={step.completed}
            >
              <StepCircle
                $active={currentStep === step.number}
                $completed={step.completed}
              >
                {step.completed ? <Check size={24} /> : step.number}
              </StepCircle>
              <StepLabel $active={currentStep === step.number}>
                {step.label}
              </StepLabel>
            </StepItem>
          ))}
        </StepsContainer>
      </StepsHeader>

      <Content>{children}</Content>
    </Wrapper>
  );
}
