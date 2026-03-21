import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  ArrowPathIcon,
  ServerStackIcon,
} from "@heroicons/react/24/outline";
import { useProxmoxServers, useSyncProxmoxServer } from "../../api/proxmox";
import Button from "../../components/ui/button";
import StatusBadge from "../../components/shared/StatusBadge";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProxmoxDashboard() {
  const navigate = useNavigate();
  const { data: servers, isLoading } = useProxmoxServers();
  const syncMutation = useSyncProxmoxServer();

  const handleSync = async (e: React.MouseEvent, serverId: number) => {
    e.stopPropagation();
    try {
      await syncMutation.mutateAsync(serverId);
      toast.success("Server synced successfully.");
    } catch {
      // handled
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-52 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Proxmox Servers</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor your Proxmox VE servers.
          </p>
        </div>
        <Button onClick={() => navigate("/proxmox/settings")}>
          <PlusIcon className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      {servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <Card
              key={server.id}
              onClick={() => navigate(`/proxmox/${server.id}`)}
              className="cursor-pointer hover:border-input transition-colors"
            >
              <CardContent className="pt-5 pb-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5">
                        <ServerStackIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                        server.status === "connected"
                          ? "bg-primary"
                          : "bg-muted-foreground/60"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{server.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {server.host}:{server.port}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={server.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Username</p>
                    <p className="text-foreground">{server.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p className="text-foreground">
                      {server.updated_at
                        ? format(new Date(server.updated_at), "MMM d, h:mm a")
                        : "Never"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleSync(e, server.id)}
                    loading={syncMutation.isPending}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/proxmox/settings");
                    }}
                  >
                    Settings
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-muted mb-4">
              <ServerStackIcon className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Proxmox Servers</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Connect your Proxmox VE servers to monitor VMs and containers.
            </p>
            <Button onClick={() => navigate("/proxmox/settings")}>
              <PlusIcon className="h-4 w-4" />
              Add Server
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
