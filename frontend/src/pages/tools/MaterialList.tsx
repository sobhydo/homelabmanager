import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useMaterials } from "../../api/materials";
import type { Material } from "../../types/tool";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import StockIndicator from "../../components/shared/StockIndicator";
import Badge from "../../components/ui/badge";

export default function MaterialList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useMaterials({
    page,
    page_size: 20,
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<Material>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <div>
          <span className="font-medium text-foreground">{item.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => <Badge color="purple">{item.category}</Badge>,
    },
    {
      key: "quantity",
      header: "Stock",
      render: (item) => (
        <div className="flex items-center gap-1">
          <StockIndicator
            quantity={item.quantity}
            minimumStock={item.min_quantity}
            showLabel={false}
          />
          <span className="text-xs text-muted-foreground">{item.unit}</span>
        </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/materials/${item.id}/edit`);
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Materials</h1>
          <p className="text-sm text-muted-foreground">
            Track your consumable materials and filaments
          </p>
        </div>
        <Button onClick={() => navigate("/materials/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search materials..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="No materials found. Add your first material to get started."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
