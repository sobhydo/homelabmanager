import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  useProxmoxServers,
  useCreateProxmoxServer,
  useDeleteProxmoxServer,
} from "../../api/proxmox";
import type { ProxmoxServerCreate } from "../../types/proxmox";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const emptyForm: ProxmoxServerCreate = {
  name: "",
  host: "",
  port: 8006,
  username: "root@pam",
  password: "",
  token_name: "",
  token_value: "",
  verify_ssl: 0,
  notes: "",
};

export default function ProxmoxSettings() {
  const navigate = useNavigate();
  const { data: servers, isLoading } = useProxmoxServers();
  const createMutation = useCreateProxmoxServer();
  const deleteMutation = useDeleteProxmoxServer();

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProxmoxServerCreate>(emptyForm);
  const [authMode, setAuthMode] = useState<"password" | "token">("password");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.host) {
      toast.error("Name and host are required.");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      toast.success("Server added successfully.");
      setShowAdd(false);
      setForm(emptyForm);
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Server removed.");
      setDeleteId(null);
    } catch {
      // handled
    }
  };

  const serverToDelete = servers?.find((s) => s.id === deleteId);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Proxmox Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure connections to your Proxmox VE servers.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full" />
          ))}
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="space-y-3">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{server.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {server.host}:{server.port}
                    </p>
                  </div>
                  <StatusBadge status={server.status} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/proxmox/${server.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteId(server.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {server.notes && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">{server.notes}</p>
              )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
          <p className="text-muted-foreground text-sm">
            No Proxmox servers configured. Add your first server to get started.
          </p>
          </CardContent>
        </Card>
      )}

      {/* Add Server Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Proxmox Server"
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Add Server</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. PVE-01" />
            <Input label="Host" name="host" value={form.host} onChange={handleChange} required placeholder="192.168.1.10" />
            <Input label="Port" name="port" type="number" value={form.port} onChange={handleChange} />
            <Input label="Username" name="username" value={form.username} onChange={handleChange} placeholder="root@pam" />
          </div>

          <div className="flex gap-4 border-b border-border pb-2">
            <button
              type="button"
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                authMode === "password" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setAuthMode("password")}
            >
              Password
            </button>
            <button
              type="button"
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                authMode === "token" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setAuthMode("token")}
            >
              API Token
            </button>
          </div>

          {authMode === "password" ? (
            <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Token Name" name="token_name" value={form.token_name} onChange={handleChange} placeholder="mytoken" />
              <Input label="Token Value" name="token_value" type="password" value={form.token_value} onChange={handleChange} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Checkbox
              id="verify_ssl"
              checked={!!form.verify_ssl}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, verify_ssl: checked ? 1 : 0 }))
              }
            />
            <Label htmlFor="verify_ssl">Verify SSL Certificate</Label>
          </div>

          <div>
            <Label className="mb-1.5">Notes</Label>
            <Textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Server"
        message={`Are you sure you want to remove "${serverToDelete?.name}"? This will not affect the actual Proxmox server.`}
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
