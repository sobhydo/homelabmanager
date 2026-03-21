import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useFootprint,
  useCreateFootprint,
  useUpdateFootprint,
} from "../../api/footprints";
import type { FootprintCreate } from "../../types/footprint";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const FOOTPRINT_CATEGORIES = [
  { value: "SMD", label: "SMD" },
  { value: "Through-hole", label: "Through-hole" },
  { value: "BGA", label: "BGA" },
  { value: "Connector", label: "Connector" },
  { value: "Wire", label: "Wire" },
  { value: "Mechanical", label: "Mechanical" },
  { value: "Other", label: "Other" },
];

const emptyForm: FootprintCreate = {
  name: "",
  description: "",
  category: "",
  image_url: "",
};

export default function FootprintForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } =
    useFootprint(numericId);
  const createMutation = useCreateFootprint();
  const updateMutation = useUpdateFootprint(numericId);

  const [form, setForm] = useState<FootprintCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        category: existing.category || "",
        image_url: existing.image_url || "",
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name is required.");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast.success("Footprint updated successfully.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Footprint created successfully.");
      }
      navigate("/footprints");
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Footprint" : "New Footprint"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update footprint details"
            : "Define a new component footprint"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Footprint Details</CardTitle>
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
            placeholder="e.g. 0805, SOT-23, DIP-8"
          />
          <Select
            label="Category"
            name="category"
            value={form.category || ""}
            onChange={handleChange}
            options={FOOTPRINT_CATEGORIES}
            placeholder="Select category"
          />
        </div>

        <div>
          <Label className="mb-1">Description</Label>
          <Textarea
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            rows={3}
            placeholder="Optional description"
          />
        </div>

        <Input
          label="Image URL"
          name="image_url"
          value={form.image_url || ""}
          onChange={handleChange}
          type="url"
          placeholder="https://example.com/footprint-image.png"
        />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Footprint" : "Create Footprint"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
