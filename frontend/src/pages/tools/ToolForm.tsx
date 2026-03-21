import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTool, useCreateTool, useUpdateTool } from "../../api/tools";
import { TOOL_CATEGORIES } from "../../types/tool";
import type { ToolCreate } from "../../types/tool";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const conditionOptions = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "broken", label: "Broken" },
];

const emptyForm: ToolCreate = {
  name: "",
  description: "",
  category: "",
  brand: "",
  model_number: "",
  serial_number: "",
  condition: "good",
  location: "",
  purchase_date: "",
  purchase_price: 0,
  status: "available",
  notes: "",
};

export default function ToolForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useTool(numericId);
  const createMutation = useCreateTool();
  const updateMutation = useUpdateTool(numericId);

  const [form, setForm] = useState<ToolCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        category: existing.category || "",
        brand: existing.brand || "",
        model_number: existing.model_number || "",
        serial_number: existing.serial_number || "",
        condition: existing.condition || "good",
        location: existing.location || "",
        purchase_date: existing.purchase_date || "",
        purchase_price: existing.purchase_price || 0,
        status: existing.status || "available",
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
        toast.success("Tool updated.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Tool created.");
      }
      navigate("/tools");
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

  const categoryOptions = TOOL_CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Tool" : "New Tool"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update tool details" : "Add a new tool to your inventory"}
        </p>
      </div>

      {/* Tool Details */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
            <Select label="Category" name="category" value={form.category} onChange={handleChange} options={categoryOptions} placeholder="Select category" />
            <Input label="Brand" name="brand" value={form.brand} onChange={handleChange} />
            <Input label="Model" name="model_number" value={form.model_number} onChange={handleChange} />
            <Input label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} />
            <Select label="Condition" name="condition" value={form.condition} onChange={handleChange} options={conditionOptions} />
            <Input label="Location" name="location" value={form.location} onChange={handleChange} />
            <Input label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} />
            <Input label="Purchase Price" name="purchase_price" type="number" value={form.purchase_price} onChange={handleChange} min={0} step={0.01} />
          </div>
          <div>
            <Label className="mb-1.5">Description</Label>
            <Textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div>
            <Label className="mb-1.5">Notes</Label>
            <Textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Tool" : "Create Tool"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
