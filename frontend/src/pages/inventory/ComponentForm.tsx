import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useComponent,
  useCreateComponent,
  useUpdateComponent,
} from "../../api/components";
import { useCategoryTree } from "../../api/categories";
import { useFootprints } from "../../api/footprints";
import { COMPONENT_CATEGORIES } from "../../types/component";
import type { ComponentCreate } from "../../types/component";
import type { CategoryTree } from "../../types/category";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "Active", label: "Active" },
  { value: "Discontinued", label: "Discontinued" },
  { value: "NRND", label: "NRND (Not Recommended for New Designs)" },
  { value: "Obsolete", label: "Obsolete" },
];

// Flatten category tree for dropdown
function flattenCategoryTree(
  nodes: CategoryTree[],
  depth = 0
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const node of nodes) {
    result.push({
      value: String(node.id),
      label: `${"  ".repeat(depth)}${node.name}`,
    });
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  return result;
}

const emptyForm: ComponentCreate = {
  name: "",
  description: "",
  mpn: "",
  manufacturer: "",
  category: "",
  subcategory: "",
  package_type: "",
  quantity: 0,
  min_quantity: 0,
  location: "",
  datasheet_url: "",
  unit_price: 0,
  supplier: "",
  notes: "",
  category_id: null,
  footprint_id: null,
  tags: "",
  ipn: "",
  is_favorite: false,
  status: "",
  min_order_quantity: 0,
};

export default function ComponentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useComponent(numericId);
  const createMutation = useCreateComponent();
  const updateMutation = useUpdateComponent(numericId);
  const { data: categoryTree } = useCategoryTree();
  const { data: footprintData } = useFootprints({ page_size: 200 });

  const [form, setForm] = useState<ComponentCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        mpn: existing.mpn || "",
        manufacturer: existing.manufacturer || "",
        category: existing.category || "",
        subcategory: existing.subcategory || "",
        package_type: existing.package_type || "",
        quantity: existing.quantity,
        min_quantity: existing.min_quantity,
        location: existing.location || "",
        datasheet_url: existing.datasheet_url || "",
        unit_price: existing.unit_price || 0,
        supplier: existing.supplier || "",
        notes: existing.notes || "",
        category_id: existing.category_id ?? null,
        footprint_id: existing.footprint_id ?? null,
        tags: existing.tags || "",
        ipn: existing.ipn || "",
        is_favorite: existing.is_favorite || false,
        status: existing.status || "",
        min_order_quantity: existing.min_order_quantity || 0,
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error("Name and category are required.");
      return;
    }

    const payload = {
      ...form,
      category_id: form.category_id ? Number(form.category_id) : null,
      footprint_id: form.footprint_id ? Number(form.footprint_id) : null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success("Component updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Component created successfully.");
      }
      navigate("/inventory");
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

  const categoryOptions = COMPONENT_CATEGORIES.map((c) => ({
    value: c,
    label: c,
  }));

  const categoryTreeOptions = categoryTree ? flattenCategoryTree(categoryTree) : [];

  const footprintOptions = footprintData?.items
    ? footprintData.items.map((fp) => ({ value: String(fp.id), label: fp.name }))
    : [];

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Component" : "New Component"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update component details" : "Add a new component to your inventory"}
        </p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
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
            placeholder="e.g. 10k Ohm Resistor"
          />
          <Select
            label="Category (legacy)"
            name="category"
            value={form.category}
            onChange={handleChange}
            options={categoryOptions}
            placeholder="Select category"
          />
          <div>
            <Label className="mb-1">Part Category</Label>
            <select
              name="category_id"
              value={form.category_id ? String(form.category_id) : ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  category_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">None</option>
              {categoryTreeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1">Footprint</Label>
            <select
              name="footprint_id"
              value={form.footprint_id ? String(form.footprint_id) : ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  footprint_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">None</option>
              {footprintOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label className="mb-1.5">Description</Label>
          <AITextarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Optional description"
            entityType="component"
            formContext={form}
          />
        </div>
        </CardContent>
      </Card>

      {/* Identification */}
      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="MPN"
            name="mpn"
            value={form.mpn}
            onChange={handleChange}
            placeholder="Manufacturer part number"
          />
          <Input
            label="IPN"
            name="ipn"
            value={form.ipn || ""}
            onChange={handleChange}
            placeholder="Internal part number"
          />
          <Input
            label="Tags"
            name="tags"
            value={form.tags || ""}
            onChange={handleChange}
            placeholder="Comma-separated tags"
            helperText="e.g. smd, 0805, precision"
          />
          <Input
            label="Package Type"
            name="package_type"
            value={form.package_type}
            onChange={handleChange}
            placeholder="e.g. 0805, DIP-8"
          />
        </div>
        </CardContent>
      </Card>

      {/* Manufacturer */}
      <Card>
        <CardHeader>
          <CardTitle>Manufacturer</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Manufacturer"
            name="manufacturer"
            value={form.manufacturer}
            onChange={handleChange}
          />
          <Input
            label="Subcategory"
            name="subcategory"
            value={form.subcategory}
            onChange={handleChange}
          />
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
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleChange}
            min={0}
          />
          <Input
            label="Minimum Stock"
            name="min_quantity"
            type="number"
            value={form.min_quantity}
            onChange={handleChange}
            min={0}
          />
          <Input
            label="Min Order Quantity"
            name="min_order_quantity"
            type="number"
            value={form.min_order_quantity || 0}
            onChange={handleChange}
            min={0}
          />
          <Input
            label="Location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Shelf A"
          />
        </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Status"
            name="status"
            value={form.status || ""}
            onChange={handleChange}
            options={STATUS_OPTIONS}
          />
          <div className="flex items-end pb-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_favorite"
                checked={form.is_favorite || false}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_favorite: !!checked }))
                }
              />
              <Label htmlFor="is_favorite" className="cursor-pointer">Mark as favorite</Label>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Supplier & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier & Pricing</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Unit Price"
            name="unit_price"
            type="number"
            value={form.unit_price}
            onChange={handleChange}
            min={0}
            step={0.01}
          />
          <Input
            label="Supplier"
            name="supplier"
            value={form.supplier}
            onChange={handleChange}
          />
          <Input
            label="Datasheet URL"
            name="datasheet_url"
            value={form.datasheet_url}
            onChange={handleChange}
            type="url"
          />
        </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
        <AITextarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={4}
          placeholder="Any additional notes..."
          entityType="component"
          formContext={form}
        />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Component" : "Create Component"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
