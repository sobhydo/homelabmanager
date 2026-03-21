import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useSuppliers } from "../../api/suppliers";
import type { Supplier } from "../../types/supplier";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import Badge from "../../components/ui/badge";

export default function SupplierList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useSuppliers({
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

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">
          {item.name}
        </span>
      ),
    },
    {
      key: "website",
      header: "Website",
      render: (item) =>
        item.website ? (
          <a
            href={item.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-muted-foreground/60">-</span>
        ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (item) => (
        <span className="text-muted-foreground">
          {item.phone || "-"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (item) =>
        item.email ? (
          <a
            href={`mailto:${item.email}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.email}
          </a>
        ) : (
          <span className="text-muted-foreground/60">-</span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (item) => (
        <Badge color={item.is_active ? "green" : "gray"} dot>
          {item.is_active ? "Active" : "Inactive"}
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
            navigate(`/suppliers/${item.id}/edit`);
          }}
        >
          Edit
        </Button>
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
              Suppliers
            </h1>
            {data && (
              <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary">
                {data.total}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your component suppliers
          </p>
        </div>
        <Button onClick={() => navigate("/suppliers/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search suppliers..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        onRowClick={(item) => navigate(`/suppliers/${item.id}`)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No suppliers found. Add your first supplier to get started."
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
