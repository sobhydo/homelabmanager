import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useFootprints, useDeleteFootprint } from "../../api/footprints";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import SearchBar from "../../components/ui/SearchBar";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";

const FOOTPRINT_CATEGORY_COLORS: Record<string, "blue" | "green" | "purple" | "orange" | "gray"> = {
  SMD: "blue",
  "Through-hole": "green",
  BGA: "purple",
  Connector: "orange",
};

export default function FootprintList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useFootprints({
    search,
    page,
    page_size: 25,
  });
  const deleteMutation = useDeleteFootprint();

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Footprint deleted.");
      setDeleteId(null);
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Footprints
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage component package footprints
          </p>
        </div>
        <Button onClick={() => navigate("/footprints/new")}>
          <PlusIcon className="h-4 w-4" />
          Add Footprint
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchBar
          onChange={handleSearch}
          placeholder="Search footprints..."
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((fp) => (
                    <tr
                      key={fp.id}
                      className="hover:bg-accent transition-colors"
                    >
                      <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                        {fp.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {fp.category ? (
                          <Badge
                            color={
                              FOOTPRINT_CATEGORY_COLORS[fp.category] || "gray"
                            }
                          >
                            {fp.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                        {fp.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/footprints/${fp.id}/edit`)
                            }
                            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-accent transition-colors"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(fp.id)}
                            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-red-600 hover:bg-accent transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-border">
                <Pagination
                  page={page}
                  totalPages={data.total_pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              {search ? "No footprints match your search." : "No footprints yet."}
            </p>
            {!search && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate("/footprints/new")}
              >
                <PlusIcon className="h-4 w-4" />
                Create First Footprint
              </Button>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Footprint"
        message="Are you sure you want to delete this footprint? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
