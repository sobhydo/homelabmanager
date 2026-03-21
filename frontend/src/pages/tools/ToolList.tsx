import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useTools, useReturnTool } from "../../api/tools";
import type { Tool } from "../../types/tool";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";
import toast from "react-hot-toast";

export default function ToolList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const returnMutation = useReturnTool();

  const { data, isLoading } = useTools({
    page,
    page_size: 20,
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleReturn = async (e: React.MouseEvent, toolId: number) => {
    e.stopPropagation();
    try {
      await returnMutation.mutateAsync(toolId);
      toast.success("Tool returned successfully.");
    } catch {
      // handled
    }
  };

  const columns: Column<Tool>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <div>
          <span className="font-medium text-foreground">{item.name}</span>
          {item.brand && (
            <span className="text-xs text-muted-foreground ml-2">{item.brand}</span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => <Badge color="blue">{item.category}</Badge>,
    },
    {
      key: "condition",
      header: "Condition",
      render: (item) => <StatusBadge status={item.condition} />,
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <span className="text-muted-foreground">{item.location || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) =>
        item.status === "checked_out" ? (
          <div className="flex items-center gap-2">
            <Badge color="orange" dot>
              Checked out
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleReturn(e, item.id)}
              loading={returnMutation.isPending}
            >
              Return
            </Button>
          </div>
        ) : (
          <Badge color="green" dot>
            {item.status || "Available"}
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/tools/${item.id}/edit`);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Tools</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your lab tools and equipment
          </p>
        </div>
        <Button onClick={() => navigate("/tools/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Tool
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search tools..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="No tools found. Add your first tool to get started."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
