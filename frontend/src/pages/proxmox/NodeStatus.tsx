import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useProxmoxNodes, useProxmoxVMs, useProxmoxServer } from "../../api/proxmox";
import Button from "../../components/ui/button";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";
import type { ProxmoxVM } from "../../types/proxmox";
import Table, { type Column } from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function ResourceBar({ label, used, total, unit }: { label: string; used: number; total: number; unit?: string }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const barColor = pct > 90
    ? "bg-red-500"
    : pct > 70
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {unit === "bytes" ? formatBytes(used) : used.toFixed(1)} / {unit === "bytes" ? formatBytes(total) : total.toFixed(1)}
          {unit === "bytes" ? "" : unit ? ` ${unit}` : ""}
          <span className="text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function NodeStatus() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const numericId = Number(serverId);

  const { data: server } = useProxmoxServer(numericId);
  const { data: nodes, isLoading } = useProxmoxNodes(numericId);
  const { data: vms } = useProxmoxVMs(numericId);
  const firstNode = nodes && nodes.length > 0 ? nodes[0] : null;

  const vmColumns: Column<ProxmoxVM>[] = [
    {
      key: "vmid",
      header: "VMID",
      render: (item) => <span className="font-mono text-xs text-foreground">{item.vmid}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (item) => (
        <Badge color={item.vm_type === "qemu" ? "blue" : "purple"}>
          {item.vm_type === "qemu" ? "VM" : "CT"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "cpu",
      header: "CPU",
      render: (item) => <span className="text-foreground">{item.cpu != null ? `${(item.cpu * 100).toFixed(0)}%` : "-"}</span>,
    },
    {
      key: "memory",
      header: "Memory",
      render: (item) => (
        <span className="text-foreground">
          {item.memory != null ? formatBytes(item.memory) : "-"}
        </span>
      ),
    },
    {
      key: "disk",
      header: "Disk",
      render: (item) => (
        <span className="text-foreground">
          {item.disk != null ? formatBytes(item.disk) : "-"}
        </span>
      ),
    },
    {
      key: "uptime",
      header: "Uptime",
      render: (item) => (
        <span className="text-muted-foreground">{item.uptime && item.uptime > 0 ? formatUptime(item.uptime) : "-"}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/proxmox")}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {server?.name || "Proxmox Server"}
        </h1>
      </div>

      {firstNode && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Node Info */}
          <Card>
            <CardHeader>
              <CardTitle>Node Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={firstNode.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm text-foreground">{firstNode.uptime ? formatUptime(firstNode.uptime) : "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {firstNode.cpu != null && (
                  <ResourceBar
                    label="CPU"
                    used={firstNode.cpu * 100}
                    total={100}
                    unit="%"
                  />
                )}
                {firstNode.memory_used != null && firstNode.memory_total != null && (
                  <ResourceBar
                    label="Memory"
                    used={firstNode.memory_used}
                    total={firstNode.memory_total}
                    unit="bytes"
                  />
                )}
                {firstNode.disk_used != null && firstNode.disk_total != null && (
                  <ResourceBar
                    label="Storage"
                    used={firstNode.disk_used}
                    total={firstNode.disk_total}
                    unit="bytes"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VMs & Containers */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Machines & Containers</CardTitle>
        </CardHeader>
        <Table
          columns={vmColumns}
          data={vms || []}
          rowKey={(item) => `${item.node}-${item.vmid}`}
          emptyMessage="No VMs or containers found on this node."
        />
      </Card>
    </div>
  );
}
