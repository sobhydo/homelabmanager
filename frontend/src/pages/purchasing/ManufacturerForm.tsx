import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useManufacturer,
  useCreateManufacturer,
  useUpdateManufacturer,
} from "../../api/manufacturers";
import type { ManufacturerCreate } from "../../types/supplier";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const emptyForm: ManufacturerCreate & { is_active: boolean } = {
  name: "",
  description: "",
  website: "",
  notes: "",
  is_active: true,
};

export default function ManufacturerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } =
    useManufacturer(numericId);
  const createMutation = useCreateManufacturer();
  const updateMutation = useUpdateManufacturer(numericId);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        website: existing.website || "",
        notes: existing.notes || "",
        is_active: existing.is_active,
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast.success("Manufacturer updated successfully.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Manufacturer created successfully.");
      }
      navigate("/manufacturers");
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

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Manufacturer" : "New Manufacturer"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update manufacturer details"
            : "Add a new manufacturer to your directory"}
        </p>
      </div>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Texas Instruments"
            />
            <Input
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              type="url"
              placeholder="https://www.example.com"
            />
          </div>
          <div>
            <Label className="mb-1.5">Description</Label>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Status & Notes</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_active: checked }))
              }
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <Textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Any additional notes..."
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Manufacturer" : "Create Manufacturer"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
