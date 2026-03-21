import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useMachine, useCreateMachine, useUpdateMachine } from "../../api/machines";
import { MACHINE_TYPES } from "../../types/machine";
import type { MachineCreate } from "../../types/machine";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusOptions = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "maintenance", label: "Maintenance" },
  { value: "error", label: "Error" },
];

const emptyForm: MachineCreate = {
  name: "",
  description: "",
  machine_type: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  status: "offline",
  ip_address: "",
  location: "",
  purchase_date: "",
  purchase_price: 0,
  notes: "",
};

export default function MachineForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useMachine(numericId);
  const createMutation = useCreateMachine();
  const updateMutation = useUpdateMachine(numericId);

  const [form, setForm] = useState<MachineCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        machine_type: existing.machine_type || "",
        manufacturer: existing.manufacturer || "",
        model: existing.model || "",
        serial_number: existing.serial_number || "",
        status: existing.status,
        ip_address: existing.ip_address || "",
        location: existing.location || "",
        purchase_date: existing.purchase_date || "",
        purchase_price: existing.purchase_price || 0,
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
    if (!form.name || !form.machine_type) {
      toast.error("Name and machine type are required.");
      return;
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast.success("Machine updated.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Machine created.");
      }
      navigate("/machines");
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

  const typeOptions = MACHINE_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Machine" : "New Machine"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update machine configuration" : "Register a new machine in your lab"}
        </p>
      </div>

      {/* Machine Details */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
            <Select label="Type" name="machine_type" value={form.machine_type} onChange={handleChange} options={typeOptions} placeholder="Select type" />
            <Input label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
            <Input label="Model" name="model" value={form.model} onChange={handleChange} />
            <Input label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} />
            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={statusOptions} />
            <Input label="IP Address" name="ip_address" value={form.ip_address} onChange={handleChange} placeholder="e.g. 192.168.1.100" />
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
        <Button type="submit" loading={isSaving}>{isEdit ? "Update Machine" : "Create Machine"}</Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
      </div>
    </form>
  );
}
