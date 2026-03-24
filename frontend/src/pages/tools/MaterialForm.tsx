import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useMaterial, useCreateMaterial, useUpdateMaterial } from "../../api/materials";
import { MATERIAL_CATEGORIES } from "../../types/tool";
import type { MaterialCreate } from "../../types/tool";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const emptyForm: MaterialCreate = {
  name: "",
  description: "",
  category: "",
  quantity: 0,
  unit: "pcs",
  min_quantity: 0,
  location: "",
  unit_price: 0,
  supplier: "",
  notes: "",
};

export default function MaterialForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useMaterial(numericId);
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial(numericId);

  const [form, setForm] = useState<MaterialCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        category: existing.category || "",
        quantity: existing.quantity,
        unit: existing.unit || "pcs",
        min_quantity: existing.min_quantity,
        location: existing.location || "",
        unit_price: existing.unit_price || 0,
        supplier: existing.supplier || "",
        notes: existing.notes || "",
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error("Name and category are required.");
      return;
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast.success("Material updated.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Material created.");
      }
      navigate("/materials");
    } catch {
      // handled
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

  const categoryOptions = MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Material" : "New Material"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update material details" : "Add a new material to your inventory"}
        </p>
      </div>

      {/* Material Details */}
      <Card>
        <CardHeader>
          <CardTitle>Material Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
          <Select label="Category" name="category" value={form.category} onChange={handleChange} options={categoryOptions} placeholder="Select category" />
          <Input label="Supplier" name="supplier" value={form.supplier} onChange={handleChange} />
        </div>
        </CardContent>
      </Card>

      {/* Stock & Location */}
      <Card>
        <CardHeader>
          <CardTitle>Stock & Location</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Quantity" name="quantity" type="number" value={form.quantity} onChange={handleChange} min={0} />
          <Input label="Unit" name="unit" value={form.unit} onChange={handleChange} placeholder="e.g. pcs, g, ml, m" />
          <Input label="Minimum Stock" name="min_quantity" type="number" value={form.min_quantity} onChange={handleChange} min={0} />
          <Input label="Location" name="location" value={form.location} onChange={handleChange} />
          <Input label="Unit Price" name="unit_price" type="number" value={form.unit_price} onChange={handleChange} min={0} step={0.01} />
        </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <AITextarea name="notes" value={form.notes} onChange={handleChange} rows={4} entityType="material" formContext={form} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>{isEdit ? "Update Material" : "Create Material"}</Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
      </div>
    </form>
  );
}
