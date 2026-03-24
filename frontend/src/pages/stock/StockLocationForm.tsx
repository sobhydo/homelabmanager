import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useStockLocation,
  useCreateStockLocation,
  useUpdateStockLocation,
  useStockLocations,
} from "../../api/stock";
import type { StockLocationCreate } from "../../types/stock";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const emptyForm: StockLocationCreate = {
  name: "",
  description: "",
  parent_id: null,
};

export default function StockLocationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } =
    useStockLocation(numericId);
  const createMutation = useCreateStockLocation();
  const updateMutation = useUpdateStockLocation(numericId);
  const { data: allLocations } = useStockLocations();

  const [form, setForm] = useState<StockLocationCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        parent_id: existing.parent_id,
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "parent_id") {
      setForm((prev) => ({
        ...prev,
        parent_id: value ? Number(value) : null,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Location name is required.");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast.success("Location updated successfully.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Location created successfully.");
      }
      navigate("/stock-locations");
    } catch {
      // Error handled by interceptor
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const parentOptions = (allLocations || [])
    .filter((loc) => loc.id !== numericId)
    .map((loc) => ({
      value: String(loc.id),
      label: loc.pathstring || loc.name,
    }));

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Location" : "New Stock Location"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update location details"
            : "Create a new storage location for stock items"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Shelf A, Drawer 3, Warehouse"
            />
            <Select
              label="Parent Location"
              name="parent_id"
              value={form.parent_id ? String(form.parent_id) : ""}
              onChange={handleChange}
              options={parentOptions}
              placeholder="None (top-level location)"
            />
            <div>
              <Label className="mb-1">Description</Label>
              <AITextarea
                name="description"
                value={form.description || ""}
                onChange={handleChange}
                rows={3}
                placeholder="Optional description of this location"
                entityType="stock location"
                formContext={form}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Location" : "Create Location"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
