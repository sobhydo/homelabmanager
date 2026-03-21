import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useSoftwareList } from "../../api/software";
import type { Software } from "../../types/software";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";

export default function SoftwareList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSoftwareList({
    page,
    page_size: 20,
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<Software>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <div>
          <span className="font-medium text-foreground">{item.name}</span>
          {item.version && (
            <span className="text-xs text-muted-foreground ml-2">v{item.version}</span>
          )}
        </div>
      ),
    },
    {
      key: "license_type",
      header: "License",
      render: (item) => <Badge color="purple">{item.license_type}</Badge>,
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (item) => (
        <span className="text-muted-foreground">{item.vendor || "-"}</span>
      ),
    },
    {
      key: "installed_on",
      header: "Installed On",
      render: (item) => (
        <span className="text-muted-foreground">{item.installed_on || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
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
            navigate(`/software/${item.id}/edit`);
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Software Licenses</h1>
          <p className="text-sm text-muted-foreground">
            Track your software licenses, keys, and expiration dates
          </p>
        </div>
        <Button onClick={() => navigate("/software/new")}>
          <PlusIcon className="h-4 w-4" />
          Add License
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search software..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="No software licenses found."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
