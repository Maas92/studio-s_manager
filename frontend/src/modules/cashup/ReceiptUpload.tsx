import React, { useRef } from "react";
import styled from "styled-components";
import { Upload, X } from "lucide-react";
import Button from "../../ui/components/Button";

interface ReceiptUploadProps {
  onUpload: (file: File) => Promise<void>;
  currentUrl?: string;
  onRemove?: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UploadButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Preview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${({ theme }) => theme.color.grey50};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const PreviewImage = styled.img`
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
`;

export default function ReceiptUpload({
  onUpload,
  currentUrl,
  onRemove,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (
      !["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(
        file.type
      )
    ) {
      alert("Only JPEG, PNG, and PDF files are allowed");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container>
      {currentUrl ? (
        <Preview>
          {currentUrl.endsWith(".pdf") ? (
            <span>📄 Receipt PDF</span>
          ) : (
            <PreviewImage src={currentUrl} alt="Receipt" />
          )}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1 }}
          >
            View Receipt
          </a>
          {onRemove && (
            <Button size="small" variation="danger" onClick={onRemove}>
              <X size={14} />
            </Button>
          )}
        </Preview>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <UploadButton
            variation="secondary"
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload Receipt"}
          </UploadButton>
        </>
      )}
    </Container>
  );
}
