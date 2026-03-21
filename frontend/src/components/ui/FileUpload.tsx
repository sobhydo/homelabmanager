import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number;
  label?: string;
  description?: string;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  accept,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024,
  label = "Upload a file",
  description = "Drag and drop or click to browse",
  className = "",
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxFiles,
      maxSize,
    });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input bg-background hover:border-muted-foreground"
        )}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon
          className={cn(
            "h-14 w-14 mb-4 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground/50"
          )}
        />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {fileRejections.length > 0 && (
        <div className="mt-2">
          {fileRejections.map(({ file, errors }) => (
            <p key={file.name} className="text-sm text-destructive">
              {file.name}: {errors.map((e) => e.message).join(", ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
