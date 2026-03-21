import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import {
  useStockItem,
  useMoveStockItem,
  useAdjustStockItem,
  useStockLocations,
} from "../../api/stock";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/select";
import Input from "../../components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusColors: Record<string, "green" | "yellow" | "gray" | "red"> = {
  in_stock: "green",
  reserved: "yellow",
  consumed: "gray",
  expired: "red",
  damaged: "red",
};

export default function StockItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);

  const { data: item, isLoading } = useStockItem(numericId);
  const { data: locations } = useStockLocations();
  const moveMutation = useMoveStockItem();
  const adjustMutation = useAdjustStockItem();

  const [showMove, setShowMove] = useState(false);
  const [moveLocationId, setMoveLocationId] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const handleMove = async () => {
    try {
      await moveMutation.mutateAsync({
        id: numericId,
        locationId: moveLocationId ? Number(moveLocationId) : null,
      });
      toast.success("Stock item moved successfully.");
      setShowMove(false);
    } catch {
      // handled by interceptor
    }
  };

  const handleAdjust = async () => {
    if (!adjustQuantity) {
      toast.error("Please enter a quantity.");
      return;
    }
    try {
      await adjustMutation.mutateAsync({
        id: numericId,
        quantity: Number(adjustQuantity),
        reason: adjustNotes || undefined,
      });
      toast.success("Stock quantity adjusted.");
      setShowAdjust(false);
      setAdjustQuantity("");
      setAdjustNotes("");
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

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">
          Stock item not found.
        </p>
        <Link
          to="/stock"
          className="text-primary hover:underline text-sm"
        >
          Back to stock items
        </Link>
      </div>
    );
  }

  const locationOptions = (locations || []).map((loc) => ({
    value: String(loc.id),
    label: loc.pathstring || loc.name,
  }));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/stock")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => setShowMove(true)}>
          <ArrowsRightLeftIcon className="h-4 w-4" />
          Move
        </Button>
        <Button variant="secondary" onClick={() => setShowAdjust(true)}>
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          Adjust
        </Button>
      </div>

      {/* Detail Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                {item.component_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Stock Item #{item.id}
              </p>
            </div>
            <Badge
              color={statusColors[item.status] || "gray"}
              dot
            >
              {item.status.replace("_", " ")}
            </Badge>
          </div>

          <Separator className="my-0" />
          <div className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Quantity
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {item.quantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Location
                </p>
                <p className="text-sm text-foreground">
                  {item.location_name || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Serial Number
                </p>
                <p className="text-sm text-foreground font-mono">
                  {item.serial_number || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Batch
                </p>
                <p className="text-sm text-foreground">
                  {item.batch || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Expiry Date
                </p>
                <p className="text-sm text-foreground">
                  {item.expiry_date
                    ? format(new Date(item.expiry_date), "MMM d, yyyy")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                  Created
                </p>
                <p className="text-sm text-foreground">
                  {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </div>

          {item.notes && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Notes
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move Modal */}
      <Modal
        open={showMove}
        onClose={() => setShowMove(false)}
        title="Move Stock Item"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowMove(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              loading={moveMutation.isPending}
            >
              Move
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a new location for this stock item.
          </p>
          <Select
            label="Destination Location"
            value={moveLocationId}
            onChange={(e) => setMoveLocationId(e.target.value)}
            options={locationOptions}
            placeholder="Select location..."
          />
        </div>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        title="Adjust Stock Quantity"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowAdjust(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              loading={adjustMutation.isPending}
            >
              Adjust
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current quantity: <strong>{item.quantity}</strong>. Enter a positive
            number to add or negative to subtract.
          </p>
          <Input
            label="Quantity Change"
            type="number"
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(e.target.value)}
          />
          <div>
            <Label className="mb-1">Notes (optional)</Label>
            <Textarea
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              rows={2}
              placeholder="Reason for adjustment..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
