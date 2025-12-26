import styled from "styled-components";
import Button from "./Button";
import { Save, X, Edit2, Trash2 } from "lucide-react";

interface ModalActionsProps {
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onClose: () => void;
  leftActions?: React.ReactNode;
  saving?: boolean;
  deleting?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  saveDisabled?: boolean;
}

const Container = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const LeftActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const RightActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

export default function ModalActions({
  isEditing,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onClose,
  leftActions,
  saving = false,
  deleting = false,
  canEdit = true,
  canDelete = false,
  saveDisabled = false,
}: ModalActionsProps) {
  return (
    <Container>
      <LeftActions>
        {!isEditing && leftActions}
        {!isEditing && canDelete && onDelete && (
          <Button
            variation="danger"
            type="button"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 size={16} />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        )}
      </LeftActions>

      <RightActions>
        {isEditing ? (
          <>
            <Button variation="secondary" type="button" onClick={onCancel}>
              <X size={16} />
              Cancel
            </Button>
            <Button
              variation="primary"
              type="button"
              onClick={onSave}
              disabled={saving || saveDisabled}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        ) : (
          <>
            <Button variation="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            {canEdit && (
              <Button variation="primary" type="button" onClick={onEdit}>
                <Edit2 size={16} />
                Edit
              </Button>
            )}
          </>
        )}
      </RightActions>
    </Container>
  );
}