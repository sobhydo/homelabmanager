import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useCategoryTree,
} from "../../api/categories";
import type { CategoryCreate } from "../../types/category";
import type { CategoryTree } from "../../types/category";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const emptyForm: CategoryCreate = {
  name: "",
  description: "",
  parent_id: null,
};

// Flatten tree for dropdown
function flattenTree(
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
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } =
    useCategory(numericId);
  const { data: tree } = useCategoryTree();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(numericId);

  const [form, setForm] = useState<CategoryCreate>(emptyForm);

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

    const payload = {
      ...form,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success("Category updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Category created successfully.");
      }
      navigate("/categories");
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

  const parentOptions = tree ? flattenTree(tree) : [];

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Category" : "New Category"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Update category details"
            : "Create a new part category"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Resistors"
          />

          <div>
            <Label className="mb-1">Description</Label>
            <AITextarea
              name="description"
              value={form.description || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description"
              entityType="part category"
              formContext={form}
            />
          </div>

          <div>
            <Label className="mb-1">Parent Category</Label>
            <select
              name="parent_id"
              value={form.parent_id ? String(form.parent_id) : ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">None (top-level)</option>
              {parentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Update Category" : "Create Category"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
