import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";
import { useMachine, useDeleteMachine, useMaintenanceTasks } from "../../api/machines";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showDelete, setShowDelete] = useState(false);

  const { data: machine, isLoading } = useMachine(numericId);
  const { data: maintenance } = useMaintenanceTasks(numericId);
  const deleteMutation = useDeleteMachine();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("Machine deleted.");
      navigate("/machines");
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

  if (!machine) {
    return <p className="text-muted-foreground text-center py-16">Machine not found.</p>;
  }

  const isBambu = machine.manufacturer?.toLowerCase().includes("bambu");

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/machines")}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => navigate(`/machines/${id}/maintenance`)}>
          <WrenchIcon className="h-4 w-4" />
          Maintenance
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/machines/${id}/edit`)}>
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Info */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">{machine.name}</h1>
                {machine.description && (
                  <p className="text-sm text-muted-foreground">{machine.description}</p>
                )}
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <Separator className="my-0" />
            <div className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Type</p>
                  <Badge color="blue">{machine.machine_type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Manufacturer / Model</p>
                  <p className="text-sm text-foreground">{[machine.manufacturer, machine.model].filter(Boolean).join(" ") || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Serial Number</p>
                  <p className="text-sm text-foreground font-mono">{machine.serial_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">IP Address</p>
                  <p className="text-sm text-foreground font-mono">{machine.ip_address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Location</p>
                  <p className="text-sm text-foreground">{machine.location || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Purchase Price</p>
                  <p className="text-sm text-foreground">
                    {machine.purchase_price ? `${machine.purchase_price}` : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Status Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`h-3 w-3 rounded-full ${machine.status === "online" ? "bg-primary" : "bg-muted-foreground/60"}`} />
                  {machine.status === "online" && (
                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-ping opacity-50" />
                  )}
                </div>
                <span className="text-sm text-foreground">{machine.status === "online" ? "Connected" : "Disconnected"}</span>
              </div>
              {isBambu && machine.status === "online" && (
                <div className="space-y-3 p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Bambu Lab Printer</p>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Nozzle Temp</span>
                      <span className="text-foreground">-- / -- C</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full w-0 transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Bed Temp</span>
                      <span className="text-foreground">-- / -- C</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full w-0 transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Print Progress</span>
                      <span className="text-foreground">Idle</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-0 transition-all" />
                    </div>
                  </div>
                </div>
              )}
              {!isBambu && (
                <p className="text-xs text-muted-foreground">
                  Live status monitoring available for supported machines.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenance && maintenance.length > 0 ? (
            <div className="space-y-0">
              {maintenance.slice(0, 5).map((task, idx) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between py-3 ${
                    idx < Math.min(maintenance.length, 5) - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm text-foreground font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.priority} &middot; {task.scheduled_date ? format(new Date(task.scheduled_date), "MMM d, yyyy") : "No date"}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">No maintenance tasks recorded.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Machine"
        message={`Are you sure you want to delete "${machine.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
