import { useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useComponents } from "../../api/components";
import { useCategories } from "../../api/categories";
import type { Component } from "../../types/component";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Select from "../../components/ui/select";
import Pagination from "../../components/ui/Pagination";
import StockIndicator from "../../components/shared/StockIndicator";
import Badge from "../../components/ui/badge";

export default function ComponentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read values from URL
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const sortBy = searchParams.get("sort_by") || "name";
  const sortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "asc";

  // Use a ref to always have the latest searchParams without triggering re-renders
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(paramsRef.current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (p: number) => updateParams({ page: p > 1 ? String(p) : undefined }),
    [updateParams]
  );

  const handleSort = useCallback(
    (key: string) => {
      const currentSort = paramsRef.current.get("sort_by") || "name";
      const currentOrder = paramsRef.current.get("sort_order") || "asc";
      if (currentSort === key) {
        updateParams({ sort_order: currentOrder === "asc" ? "desc" : "asc" });
      } else {
        updateParams({ sort_by: key, sort_order: "asc" });
      }
    },
    [updateParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      const current = paramsRef.current.get("search") || "";
      if (value === current) return; // no change, skip
      updateParams({ search: value || undefined, page: undefined });
    },
    [updateParams]
  );

  const { data, isLoading } = useComponents({
    page,
    page_size: 20,
    search: search || undefined,
    category: category || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const { data: categories } = useCategories(0);

  const columns: Column<Component>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "mpn",
      header: "MPN",
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">{item.mpn || "-"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (item) => <Badge color="indigo">{item.category_name || item.category || "-"}</Badge>,
    },
    {
      key: "quantity",
      header: "Quantity",
      sortable: true,
      render: (item) => (
        <StockIndicator
          quantity={item.quantity}
          minimumStock={item.min_quantity}
        />
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
            navigate(`/inventory/${item.id}/edit`);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const categoryOptions = useMemo(
    () =>
      (categories || []).map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [categories]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">Components</h1>
            {data && (
              <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary">
                {data.total}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your electronic components inventory
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Component
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search components..."
          className="w-full sm:w-80"
        />
        <Select
          options={categoryOptions}
          value={category}
          onChange={(e) => {
            updateParams({ category: e.target.value || undefined, page: undefined });
          }}
          placeholder="All Categories"
          className="w-full sm:w-48"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        onRowClick={(item) => navigate(`/inventory/${item.id}`)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No components found. Add your first component to get started."
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
