import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { format, differenceInDays } from "date-fns";
import { useSubscriptions } from "../../api/subscriptions";
import type { Subscription } from "../../types/software";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";

export default function SubscriptionList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSubscriptions({
    page,
    page_size: 20,
    search: search || undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<Subscription>[] = [
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
      key: "provider",
      header: "Provider",
      render: (item) => (
        <span className="text-foreground">{item.provider || "-"}</span>
      ),
    },
    {
      key: "billing_cycle",
      header: "Billing",
      render: (item) => (
        <Badge color="blue">{item.billing_cycle}</Badge>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (item) => (
        <span className="text-foreground font-medium">
          {item.cost != null ? `$${item.cost.toFixed(2)}` : "-"}
          <span className="text-xs text-muted-foreground ml-1">/{item.billing_cycle === "monthly" ? "mo" : item.billing_cycle === "yearly" ? "yr" : item.billing_cycle}</span>
        </span>
      ),
    },
    {
      key: "expiry_date",
      header: "Expiry",
      render: (item) => {
        if (!item.expiry_date) return <span className="text-muted-foreground/60">-</span>;
        const expiry = new Date(item.expiry_date);
        const daysUntil = differenceInDays(expiry, new Date());
        const isUrgent = daysUntil <= 7 && daysUntil >= 0;
        return (
          <div>
            <span className={isUrgent ? "text-amber-400" : "text-foreground"}>
              {format(expiry, "MMM d, yyyy")}
            </span>
            {daysUntil >= 0 && daysUntil <= 30 && (
              <p className={`text-xs ${isUrgent ? "text-amber-400" : "text-muted-foreground"}`}>
                {daysUntil === 0 ? "Today" : `${daysUntil} days`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "auto_renew",
      header: "Auto-Renew",
      render: (item) =>
        item.auto_renew ? (
          <Badge color="green" dot>On</Badge>
        ) : (
          <Badge color="gray">Off</Badge>
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
            navigate(`/subscriptions/${item.id}/edit`);
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Track recurring subscriptions, billing cycles, and renewal dates
          </p>
        </div>
        <Button onClick={() => navigate("/subscriptions/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search subscriptions..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="No subscriptions found."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
