import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useBom, useBomAvailability, useBuildBom, useDeleteBom } from "../../api/boms";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import type { BomItem } from "../../types/bom";
import Table, { type Column } from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showBuild, setShowBuild] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: bom, isLoading } = useBom(numericId);
  const { data: availability } = useBomAvailability(numericId);
  const buildMutation = useBuildBom();
  const deleteMutation = useDeleteBom();

  const handleBuild = async () => {
    try {
      await buildMutation.mutateAsync(numericId);
      toast.success("BOM built successfully! Stock deducted.");
      setShowBuild(false);
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("BOM deleted.");
      navigate("/inventory/boms");
    } catch {
      // handled
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!bom) {
    return <p className="text-muted-foreground text-center py-12">BOM not found.</p>;
  }

  const columns: Column<BomItem>[] = [
    {
      key: "reference_designator",
      header: "Reference",
      render: (item) => (
        <span className="font-mono text-xs text-foreground">{item.reference_designator || "-"}</span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (item) => (
        <span className="text-foreground">{item.value || "-"}</span>
      ),
    },
    {
      key: "package",
      header: "Package",
      render: (item) => (
        <span className="text-muted-foreground text-xs">{item.package || "-"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      render: (item) => <span className="text-foreground">{item.quantity}</span>,
    },
    {
      key: "manufacturer_part_number",
      header: "MPN",
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">{item.manufacturer_part_number || "-"}</span>
      ),
    },
    {
      key: "matched",
      header: "Matched",
      render: (item) =>
        item.matched ? (
          <Badge color="green">Matched</Badge>
        ) : (
          <Badge color="red">Unmatched</Badge>
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-foreground">{item.description || "-"}</span>
      ),
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/inventory/boms")}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          onClick={() => setShowBuild(true)}
          disabled={!availability?.all_available}
        >
          Build BOM
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          Delete
        </Button>
      </div>

      {/* BOM Header & Stats */}
      <Card>
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">{bom.name}</h1>
          {bom.description && (
            <p className="text-sm text-muted-foreground mb-6">{bom.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-background border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{bom.items?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Items</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{bom.items?.filter(i => i.matched).length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Matched</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{bom.status}</p>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
            <div className="rounded-lg bg-background border border-border p-4 text-center">
              <p className={`text-2xl font-bold ${availability?.all_available ? "text-primary" : "text-red-400"}`}>
                {availability?.all_available ? "Yes" : "No"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All Available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>BOM Items</CardTitle>
        </CardHeader>
        <Table
          columns={columns}
          data={bom.items || []}
          rowKey={(item) => item.id}
          emptyMessage="No items in this BOM."
        />
      </Card>

      <ConfirmDialog
        open={showBuild}
        onClose={() => setShowBuild(false)}
        onConfirm={handleBuild}
        title="Build BOM"
        message="This will deduct the required quantities from your component stock. Continue?"
        confirmLabel="Build"
        variant="primary"
        loading={buildMutation.isPending}
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete BOM"
        message={`Are you sure you want to delete "${bom.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
