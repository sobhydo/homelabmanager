import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUploadBom } from "../../api/boms";
import FileUpload from "../../components/ui/FileUpload";
import Input from "../../components/ui/input";
import Button from "../../components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BomUpload() {
  const navigate = useNavigate();
  const uploadMutation = useUploadBom();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please provide a name for this BOM.");
      return;
    }

    try {
      const bom = await uploadMutation.mutateAsync({
        file,
        meta: { name: name.trim(), description: description.trim() || undefined },
      });
      toast.success("BOM uploaded and parsed successfully.");
      navigate(`/inventory/boms/${bom.id}`);
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Upload Bill of Materials</h1>
        <p className="text-sm text-muted-foreground">
          Upload a BOM file to match against your component inventory
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Input
            label="BOM Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arduino Shield v2"
            required
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this BOM"
          />
          <FileUpload
            onFileSelect={(files) => setFile(files[0] || null)}
            accept={{
              "text/csv": [".csv"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
              "application/vnd.ms-excel": [".xls"],
            }}
            label="Upload CSV or Excel file"
            description="Drag and drop your BOM file, or click to browse. Supports .csv, .xls, .xlsx"
          />
          {file && (
            <div className="flex items-center gap-2 rounded-lg bg-background border border-border p-3">
              <span className="text-sm text-foreground">Selected: </span>
              <span className="text-sm font-medium text-foreground">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={() => setFile(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleUpload}
          loading={uploadMutation.isPending}
          disabled={!file || !name.trim()}
        >
          Upload & Parse
        </Button>
        <Button variant="ghost" onClick={() => navigate("/inventory/boms")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
