import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSoftware, useCreateSoftware, useUpdateSoftware } from "../../api/software";
import { LICENSE_TYPES } from "../../types/software";
import type { SoftwareCreate } from "../../types/software";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "trial", label: "Trial" },
];

const emptyForm: SoftwareCreate = {
  name: "",
  description: "",
  version: "",
  category: "",
  license_type: "",
  license_key: "",
  vendor: "",
  url: "",
  installed_on: "",
  status: "active",
  notes: "",
};

export default function SoftwareForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useSoftware(numericId);
  const createMutation = useCreateSoftware();
  const updateMutation = useUpdateSoftware(numericId);

  const [form, setForm] = useState<SoftwareCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        version: existing.version || "",
        category: existing.category || "",
        license_type: existing.license_type || "",
        license_key: existing.license_key || "",
        vendor: existing.vendor || "",
        url: existing.url || "",
        installed_on: existing.installed_on || "",
        status: existing.status,
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
      [name]: type === "number" ? (value === "" ? undefined : Number(value)) : value,
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
        toast.success("License updated.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("License created.");
      }
      navigate("/software");
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

  const licenseOptions = LICENSE_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Software License" : "New Software License"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update license details" : "Add a new software license to track"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>License Details</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="Version" name="version" value={form.version} onChange={handleChange} />
            <Select label="License Type" name="license_type" value={form.license_type} onChange={handleChange} options={licenseOptions} placeholder="Select type" />
            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={statusOptions} />
            <Input label="Category" name="category" value={form.category} onChange={handleChange} />
            <Input label="License Key" name="license_key" value={form.license_key} onChange={handleChange} placeholder="XXXX-XXXX-XXXX" />
            <Input label="Vendor" name="vendor" value={form.vendor} onChange={handleChange} />
            <Input label="URL" name="url" value={form.url} onChange={handleChange} type="url" />
            <Input label="Installed On" name="installed_on" value={form.installed_on} onChange={handleChange} placeholder="e.g. Server-01" />
          </div>
          <div>
            <Label className="mb-1.5">Notes</Label>
            <Textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>{isEdit ? "Update License" : "Create License"}</Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
      </div>
    </form>
  );
}
