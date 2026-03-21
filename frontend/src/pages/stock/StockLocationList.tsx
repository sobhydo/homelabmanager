import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MapPinIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import {
  useStockLocationTree,
  useStockLocation,
  useLocationStock,
  useStockLocations,
} from "../../api/stock";
import type { StockLocationTree, StockItem } from "../../types/stock";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// --- Tree Node ---

interface TreeNodeProps {
  node: StockLocationTree;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
}

function TreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-accent"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="shrink-0 cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground/60" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground/60" />
            )}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpenIcon className="h-4 w-4 shrink-0 text-blue-500" />
        ) : (
          <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        )}
        <span className="truncate font-medium">{node.name}</span>
        {node.items_count !== undefined && node.items_count > 0 && (
          <Badge color="gray" className="ml-auto">
            {node.items_count}
          </Badge>
        )}
      </button>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function StockLocationList() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: tree, isLoading: loadingTree } = useStockLocationTree();
  const { data: selectedLocation } = useStockLocation(selectedId || 0);
  const { data: childLocations } = useStockLocations(selectedId);
  const { data: locationItems } = useLocationStock(selectedId || 0);

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: number) => {
      setSelectedId(id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    []
  );

  // Build breadcrumb from pathstring
  const breadcrumbs = selectedLocation?.pathstring
    ? selectedLocation.pathstring.split("/").filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Stock Locations
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Organize and browse your stock storage locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/stock")}
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            All Stock Items
          </Button>
          <Button onClick={() => navigate("/stock-locations/new")}>
            <PlusIcon className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Location Tree */}
        <div className="lg:col-span-4">
          <Card>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Location Tree
              </h3>
            </div>
            <div className="p-2 max-h-[600px] overflow-y-auto">
              {loadingTree ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : tree && tree.length > 0 ? (
                tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MapPinIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No locations yet
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate("/stock-locations/new")}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Create First Location
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: Selected Location Details */}
        <div className="lg:col-span-8 space-y-6">
          {selectedId && selectedLocation ? (
            <>
              {/* Breadcrumb */}
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPinIcon className="h-4 w-4" />
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <ChevronRightIcon className="h-3 w-3" />
                      )}
                      <span
                        className={
                          idx === breadcrumbs.length - 1
                            ? "text-foreground font-medium"
                            : ""
                        }
                      >
                        {crumb}
                      </span>
                    </span>
                  ))}
                </nav>
              )}

              {/* Location Info Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {selectedLocation.name}
                      </h2>
                      {selectedLocation.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLocation.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/stock-locations/${selectedId}/edit`)
                      }
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-muted-foreground">
                        Sub-locations:
                      </span>
                      <span className="font-medium text-foreground">
                        {childLocations?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArchiveBoxIcon className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-muted-foreground">
                        Stock items:
                      </span>
                      <span className="font-medium text-foreground">
                        {locationItems?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Child Locations */}
              {childLocations && childLocations.length > 0 && (
                <Card>
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">
                      Sub-locations
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {childLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelect(loc.id)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-accent transition-colors"
                      >
                        <FolderIcon className="h-5 w-5 text-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {loc.name}
                          </p>
                          {loc.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {loc.description}
                            </p>
                          )}
                        </div>
                        {loc.items_count !== undefined && (
                          <Badge color="gray">{loc.items_count} items</Badge>
                        )}
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Stock Items at this location */}
              <Card>
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Stock Items
                  </h3>
                </div>
                {locationItems && locationItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-card border-b border-border">
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Component
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Serial
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {locationItems.map((item: StockItem) => (
                          <tr
                            key={item.id}
                            onClick={() => navigate(`/stock/${item.id}`)}
                            className="cursor-pointer hover:bg-accent transition-colors"
                          >
                            <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                              {item.component_name}
                            </td>
                            <td className="px-6 py-4 text-foreground whitespace-nowrap">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                              {item.serial_number || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                color={
                                  item.status === "in_stock"
                                    ? "green"
                                    : item.status === "reserved"
                                    ? "yellow"
                                    : "gray"
                                }
                              >
                                {item.status.replace("_", " ")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ArchiveBoxIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No stock items at this location
                    </p>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center py-24">
              <div className="text-center">
                <MapPinIcon className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Select a location from the tree to view its details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
