import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  useManufacturer,
  useDeleteManufacturer,
  useManufacturerParts,
} from "../../api/manufacturers";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ManufacturerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showDelete, setShowDelete] = useState(false);

  const { data: manufacturer, isLoading } = useManufacturer(numericId);
  const { data: parts } = useManufacturerParts(numericId);
  const deleteMutation = useDeleteManufacturer();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("Manufacturer deleted.");
      navigate("/manufacturers");
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

  if (!manufacturer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">
          Manufacturer not found.
        </p>
        <Link
          to="/manufacturers"
          className="text-primary hover:underline text-sm"
        >
          Back to manufacturers
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
          onClick={() => navigate("/manufacturers")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={() => navigate(`/manufacturers/${id}/edit`)}
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Manufacturer Info Card */}
      <Card>
        <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {manufacturer.name}
              </h1>
              <Badge color={manufacturer.is_active ? "green" : "gray"} dot>
                {manufacturer.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {manufacturer.description && (
              <p className="text-sm text-muted-foreground">
                {manufacturer.description}
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
              {manufacturer.website ? (
                <a
                  href={manufacturer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {manufacturer.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <p className="text-sm text-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Created
              </p>
              <p className="text-sm text-foreground">
                {format(new Date(manufacturer.created_at), "MMM d, yyyy")}
              </p>
            </div>
            {manufacturer.updated_at && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Last Updated
                </p>
                <p className="text-sm text-foreground">
                  {format(new Date(manufacturer.updated_at), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </div>

        {manufacturer.notes && (
          <>
            <Separator className="mt-6" />
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Notes
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {manufacturer.notes}
              </p>
            </div>
          </>
        )}
        </CardContent>
      </Card>

      {/* Manufacturer Parts */}
      <Card>
        <CardContent className="pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">
          Manufacturer Parts
        </h3>
        {parts && parts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pr-4">Component</th>
                  <th className="pb-3 pr-4">MPN</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3">Link</th>
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
                      {part.manufacturer_part_number}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {part.description || "-"}
                    </td>
                    <td className="py-3">
                      {part.url ? (
                        <a
                          href={part.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No parts linked to this manufacturer yet.
          </p>
        )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Manufacturer"
        message={`Are you sure you want to delete "${manufacturer.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
