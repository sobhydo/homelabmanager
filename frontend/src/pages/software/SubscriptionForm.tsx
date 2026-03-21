import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSubscription, useCreateSubscription, useUpdateSubscription } from "../../api/subscriptions";
import { BILLING_CYCLES } from "../../types/software";
import type { SubscriptionCreate } from "../../types/software";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "paused", label: "Paused" },
  { value: "trial", label: "Trial" },
];

const billingOptions = BILLING_CYCLES.map((b) => ({
  value: b.value,
  label: b.label,
}));

const emptyForm: SubscriptionCreate = {
  name: "",
  description: "",
  provider: "",
  status: "active",
  billing_cycle: "monthly",
  cost: 0,
  start_date: "",
  expiry_date: "",
  auto_renew: 1,
  category: "",
  url: "",
  notes: "",
};

export default function SubscriptionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const numericId = isEdit ? Number(id) : 0;

  const { data: existing, isLoading: loadingExisting } = useSubscription(numericId);
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription(numericId);

  const [form, setForm] = useState<SubscriptionCreate>(emptyForm);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        provider: existing.provider || "",
        status: existing.status,
        billing_cycle: existing.billing_cycle,
        cost: existing.cost || 0,
        start_date: existing.start_date || "",
        expiry_date: existing.expiry_date || "",
        auto_renew: existing.auto_renew,
        category: existing.category || "",
        url: existing.url || "",
        notes: existing.notes || "",
      });
    }
  }, [existing, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
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
        toast.success("Subscription updated.");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Subscription created.");
      }
      navigate("/subscriptions");
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

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Subscription" : "New Subscription"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? "Update subscription details" : "Track a new recurring subscription"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. GitHub Pro" />
            <Input label="Provider" name="provider" value={form.provider} onChange={handleChange} required placeholder="e.g. GitHub" />
            <Input label="Category" name="category" value={form.category} onChange={handleChange} placeholder="e.g. DevOps, Cloud" />
            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={statusOptions} />
            <Select label="Billing Cycle" name="billing_cycle" value={form.billing_cycle} onChange={handleChange} options={billingOptions} />
            <Input label="Cost" name="cost" type="number" value={form.cost} onChange={handleChange} min={0} step={0.01} />
            <Input label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
            <Input label="Expiry Date" name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
            <Input label="URL" name="url" value={form.url} onChange={handleChange} type="url" />
            <div className="flex items-center gap-3 pt-6">
              <Checkbox
                id="auto_renew"
                checked={!!form.auto_renew}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, auto_renew: checked ? 1 : 0 }))
                }
              />
              <Label htmlFor="auto_renew">Auto-renew</Label>
            </div>
          </div>
          <div>
            <Label className="mb-1.5">Notes</Label>
            <Textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isSaving}>{isEdit ? "Update Subscription" : "Create Subscription"}</Button>
        <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
      </div>
    </form>
  );
}
