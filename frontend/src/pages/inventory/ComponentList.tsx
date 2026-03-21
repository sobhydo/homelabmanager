import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useComponents } from "../../api/components";
import { COMPONENT_CATEGORIES } from "../../types/component";
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useComponents({
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
      render: (item) => <Badge color="indigo">{item.category}</Badge>,
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

  const filteredData = category
    ? (data?.items || []).filter((c) => c.category === category)
    : data?.items || [];

  const categoryOptions = COMPONENT_CATEGORIES.map((c) => ({
    value: c,
    label: c,
  }));

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
            setCategory(e.target.value);
            setPage(1);
          }}
          placeholder="All Categories"
          className="w-full sm:w-48"
        />
      </div>

      <Table
        columns={columns}
        data={filteredData}
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
