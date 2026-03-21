import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStockItems } from "../../api/stock";
import type { StockItem } from "../../types/stock";
import Table, { type Column } from "../../components/ui/table";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import Badge from "../../components/ui/badge";
import { format } from "date-fns";

const statusColors: Record<string, "green" | "yellow" | "gray" | "red"> = {
  in_stock: "green",
  reserved: "yellow",
  consumed: "gray",
  expired: "red",
  damaged: "red",
};

export default function StockItemList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("component_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useStockItems({
    page,
    page_size: 20,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("asc");
      }
    },
    [sortBy]
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<StockItem>[] = [
    {
      key: "component_name",
      header: "Component",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">
          {item.component_name}
        </span>
      ),
    },
    {
      key: "location_name",
      header: "Location",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {item.location_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-foreground">
          {item.quantity}
        </span>
      ),
    },
    {
      key: "serial_number",
      header: "Serial",
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.serial_number || "-"}
        </span>
      ),
    },
    {
      key: "batch",
      header: "Batch",
      render: (item) => (
        <span className="text-muted-foreground">
          {item.batch || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <Badge color={statusColors[item.status] || "gray"} dot>
          {item.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "expiry_date",
      header: "Expiry",
      render: (item) => (
        <span className="text-muted-foreground text-xs">
          {item.expiry_date
            ? format(new Date(item.expiry_date), "MMM d, yyyy")
            : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Stock Items
            </h1>
            {data && (
              <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary">
                {data.total}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage all stock items across locations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search stock items..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        onRowClick={(item) => navigate(`/stock/${item.id}`)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No stock items found."
      />

      {data && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
