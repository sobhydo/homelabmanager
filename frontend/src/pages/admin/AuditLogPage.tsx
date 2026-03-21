import { useState } from "react";
import { useAuditLogs } from "@/api/auditLogs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import NativeSelect from "@/components/ui/select";
import DataTable, { type Column } from "@/components/ui/table";
import Pagination from "@/components/ui/Pagination";
import type { AuditLog } from "@/types/user";
import { Card, CardContent } from "@/components/ui/card";

const actionColors: Record<string, "blue" | "green" | "red" | "yellow" | "gray" | "purple"> = {
  create: "green",
  update: "blue",
  delete: "red",
  login: "purple",
  logout: "gray",
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useAuditLogs({
    page,
    page_size: 25,
    action: action || undefined,
    entity_type: entityType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Time",
      render: (log) =>
        new Date(log.created_at).toLocaleString(),
    },
    {
      key: "username",
      header: "User",
      render: (log) => (
        <span className="font-medium text-foreground">
          {log.username || "System"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (log) => (
        <Badge color={actionColors[log.action] || "gray"}>
          {log.action}
        </Badge>
      ),
    },
    {
      key: "entity_type",
      header: "Entity Type",
      render: (log) => (
        <span className="text-muted-foreground">
          {log.entity_type || "--"}
        </span>
      ),
    },
    {
      key: "entity_id",
      header: "Entity ID",
      render: (log) => (
        <span className="text-muted-foreground font-mono text-xs">
          {log.entity_id ?? "--"}
        </span>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (log) => (
        <span className="text-muted-foreground text-xs max-w-xs truncate block">
          {log.details || "--"}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP Address",
      render: (log) => (
        <span className="text-muted-foreground font-mono text-xs">
          {log.ip_address || "--"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          View system activity and user actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
        <div className="w-40">
          <NativeSelect
            label="Action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "create", label: "Create" },
              { value: "update", label: "Update" },
              { value: "delete", label: "Delete" },
              { value: "login", label: "Login" },
              { value: "logout", label: "Logout" },
            ]}
            placeholder="All Actions"
          />
        </div>
        <div className="w-40">
          <Input
            label="Entity Type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. user"
          />
        </div>
        <div className="w-44">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-44">
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(log) => log.id}
        emptyMessage="No audit logs found"
      />

      {data && data.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
