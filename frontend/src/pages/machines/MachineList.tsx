import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useMachines } from "../../api/machines";
import type { Machine } from "../../types/machine";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";

export default function MachineList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useMachines({
    page,
    page_size: 20,
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<Machine>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <div>
          <span className="font-medium text-foreground">{item.name}</span>
          {item.manufacturer && (
            <p className="text-xs text-muted-foreground">{item.manufacturer} {item.model || ""}</p>
          )}
        </div>
      ),
    },
    {
      key: "machine_type",
      header: "Type",
      render: (item) => <Badge color="blue">{item.machine_type}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "ip_address",
      header: "IP Address",
      render: (item) => (
        <span className="text-muted-foreground font-mono text-xs">{item.ip_address || "-"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <span className="text-muted-foreground">{item.location || "-"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/machines/${item.id}/maintenance`);
            }}
          >
            Maintenance
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/machines/${item.id}/edit`);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Machines</h1>
          <p className="text-sm text-muted-foreground">
            Manage your lab machines, printers, and equipment
          </p>
        </div>
        <Button onClick={() => navigate("/machines/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Machine
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search machines..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        onRowClick={(item) => navigate(`/machines/${item.id}`)}
        emptyMessage="No machines found. Add your first machine to get started."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
