import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useBoms } from "../../api/boms";
import type { Bom } from "../../types/bom";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import Pagination from "../../components/ui/Pagination";
import Badge from "../../components/ui/badge";

export default function BomList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBoms({ page, page_size: 20 });

  const columns: Column<Bom>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-muted-foreground">{item.description || "-"}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (item) => <span className="text-foreground">{item.items?.length ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <Badge color={item.status === "imported" ? "green" : "yellow"}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (item) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Bills of Materials</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage Bills of Materials to check component availability.
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/boms/upload")}>
          <PlusIcon className="h-4 w-4" />
          Upload BOM
        </Button>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        onRowClick={(item) => navigate(`/inventory/boms/${item.id}`)}
        emptyMessage="No BOMs uploaded yet. Upload your first BOM to get started."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
