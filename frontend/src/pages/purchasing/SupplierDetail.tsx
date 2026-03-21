import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  useSupplier,
  useDeleteSupplier,
  useSupplierParts,
} from "../../api/suppliers";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showDelete, setShowDelete] = useState(false);

  const { data: supplier, isLoading } = useSupplier(numericId);
  const { data: parts } = useSupplierParts(numericId);
  const deleteMutation = useDeleteSupplier();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("Supplier deleted.");
      navigate("/suppliers");
    } catch {
      // handled by interceptor
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">
          Supplier not found.
        </p>
        <Link
          to="/suppliers"
          className="text-primary hover:underline text-sm"
        >
          Back to suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/suppliers")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={() => navigate(`/suppliers/${id}/edit`)}
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Supplier Info Card */}
      <Card>
        <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {supplier.name}
              </h1>
              <Badge color={supplier.is_active ? "green" : "gray"} dot>
                {supplier.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {supplier.description && (
              <p className="text-sm text-muted-foreground">
                {supplier.description}
              </p>
            )}
          </div>
        </div>

        <Separator className="my-0" />
        <div className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Website
              </p>
              {supplier.website ? (
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {supplier.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <p className="text-sm text-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Phone
              </p>
              <p className="text-sm text-foreground">
                {supplier.phone || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </p>
              {supplier.email ? (
                <a
                  href={`mailto:${supplier.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {supplier.email}
                </a>
              ) : (
                <p className="text-sm text-foreground">-</p>
              )}
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Address
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {supplier.address || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Created
              </p>
              <p className="text-sm text-foreground">
                {format(new Date(supplier.created_at), "MMM d, yyyy")}
              </p>
            </div>
            {supplier.updated_at && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Last Updated
                </p>
                <p className="text-sm text-foreground">
                  {format(new Date(supplier.updated_at), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </div>

        {supplier.notes && (
          <>
            <Separator className="mt-6" />
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Notes
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          </>
        )}
        </CardContent>
      </Card>

      {/* Supplier Parts */}
      <Card>
        <CardContent className="pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">
          Supplier Parts
        </h3>
        {parts && parts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pr-4">Component</th>
                  <th className="pb-3 pr-4">Part Number</th>
                  <th className="pb-3 pr-4">Unit Price</th>
                  <th className="pb-3 pr-4">Pack Qty</th>
                  <th className="pb-3 pr-4">Lead Time</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parts.map((part) => (
                  <tr
                    key={part.id}
                    className="hover:bg-accent transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {part.component_name}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {part.supplier_part_number || "-"}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {part.unit_price != null
                        ? `${part.unit_price} ${part.currency}`
                        : "-"}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {part.pack_quantity}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {part.lead_time_days != null
                        ? `${part.lead_time_days} days`
                        : "-"}
                    </td>
                    <td className="py-3">
                      <Badge color={part.is_active ? "green" : "gray"} dot>
                        {part.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No parts linked to this supplier yet.
          </p>
        )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
