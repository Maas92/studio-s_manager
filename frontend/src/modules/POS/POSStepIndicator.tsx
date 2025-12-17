import React from "react";
import styled from "styled-components";
import { Check } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Step {
  number: number;
  label: string;
}

interface POSStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: ${({ theme }) => theme.shadowSm};
`;

const StepsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const StepItem = styled.div<{
  $active: boolean;
  $completed: boolean;
  $clickable: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 2;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: all 0.2s ease;

  ${({ $clickable }) =>
    $clickable &&
    `
    &:hover {
      transform: translateY(-2px);
    }
  `}

  @media (max-width: 640px) {
    gap: 0.5rem;
  }
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $active, $completed, theme }) =>
    $active || $completed ? theme.shadowMd : theme.shadowSm};

  @media (max-width: 640px) {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 0.875rem;
  }
`;

const StepLabel = styled.div<{ $active: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, theme }) =>
    $active ? theme.color.text : theme.color.mutedText};
  text-align: center;
  max-width: 100px;
  transition: all 0.2s ease;

  @media (max-width: 640px) {
    font-size: 0.75rem;
    max-width: 80px;
  }
`;

const ProgressLine = styled.div`
  position: absolute;
  top: 1.75rem;
  left: 0;
  right: 0;
  height: 3px;
  background: ${({ theme }) => theme.color.grey300};
  z-index: 1;

  @media (max-width: 640px) {
    top: 1.375rem;
  }
`;

const ProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.brand500},
    ${({ theme }) => theme.color.brand600}
  );
  width: ${({ $progress }) => $progress}%;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 2px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

export default function POSStepIndicator({
  steps,
  currentStep,
  onStepClick,
}: POSStepIndicatorProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleStepClick = (stepNumber: number) => {
    // Can only go back to previous steps, not forward
    if (stepNumber < currentStep) {
      onStepClick(stepNumber);
    }
  };

  const isStepCompleted = (stepNumber: number) => stepNumber < currentStep;
  const isStepActive = (stepNumber: number) => stepNumber === currentStep;
  const isStepClickable = (stepNumber: number) => stepNumber < currentStep;

  return (
    <Container>
      <StepsContainer>
        <ProgressLine>
          <ProgressFill $progress={progress} />
        </ProgressLine>

        {steps.map((step) => {
          const completed = isStepCompleted(step.number);
          const active = isStepActive(step.number);
          const clickable = isStepClickable(step.number);

          return (
            <StepItem
              key={step.number}
              $active={active}
              $completed={completed}
              $clickable={clickable}
              onClick={() => clickable && handleStepClick(step.number)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleStepClick(step.number);
                }
              }}
              aria-label={`Step ${step.number}: ${step.label}${
                completed ? " (completed)" : active ? " (current)" : ""
              }`}
            >
              <StepCircle $active={active} $completed={completed}>
                {completed ? <Check size={24} strokeWidth={3} /> : step.number}
              </StepCircle>
              <StepLabel $active={active}>{step.label}</StepLabel>
            </StepItem>
          );
        })}
      </StepsContainer>
    </Container>
  );
}
