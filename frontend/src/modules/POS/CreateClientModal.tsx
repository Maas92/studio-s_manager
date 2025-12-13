import React, { useState, useCallback } from "react";
import Modal from "../../ui/components/Modal";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import styled from "styled-components";
import { UserPlus, AlertCircle } from "lucide-react";

const Content = styled.div`
  display: grid;
  gap: 1rem;
`;
const Info = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.mutedText};
  background: ${({ theme }) => theme.color.brand50};
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
`;

export default function CreateClientModal({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone?: string; email?: string }) => void;
  submitting?: boolean;
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (form.phone && !/^[\d+\-\s()]+$/.test(form.phone))
      e.phone = "Invalid phone";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const submit = useCallback(() => {
    if (!validate()) return;
    onSubmit(form);
  }, [validate, onSubmit, form]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Client" size="md">
      <Content>
        <Info>
          Create a client profile to track appointments, purchases and loyalty.
        </Info>

        <div>
          <label style={{ fontWeight: 700 }}>Full name</label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          {errors.name && (
            <div
              style={{
                color: "var(--red500)",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <AlertCircle />
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontWeight: 700 }}>Phone</label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          {errors.phone && (
            <div
              style={{
                color: "var(--red500)",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <AlertCircle />
              {errors.phone}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontWeight: 700 }}>Email</label>
          <Input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          {errors.email && (
            <div
              style={{
                color: "var(--red500)",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <AlertCircle />
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button variation="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variation="primary"
            onClick={submit}
            disabled={submitting || !form.name.trim()}
          >
            <UserPlus size={18} style={{ marginRight: 8 }} />
            {submitting ? "Creating..." : "Create client"}
          </Button>
        </div>
      </Content>
    </Modal>
  );
}
