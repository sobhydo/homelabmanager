import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  PlusIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CpuChipIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useCategoryTree, useCategories } from "../../api/categories";
import { useComponents } from "../../api/components";
import type { CategoryTree } from "../../types/category";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// --- Tree Node ---

interface TreeNodeProps {
  node: CategoryTree;
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
        {node.parts_count !== undefined && node.parts_count > 0 && (
          <Badge color="gray" className="ml-auto">
            {node.parts_count}
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

export default function CategoryList() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: tree, isLoading: loadingTree } = useCategoryTree();
  const { data: childCategories } = useCategories(selectedId);
  const { data: componentData } = useComponents(
    selectedId ? { search: "", page: 1, page_size: 50 } : {}
  );

  // Find selected node from tree
  const findNode = (
    nodes: CategoryTree[],
    id: number
  ): CategoryTree | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedCategory =
    tree && selectedId ? findNode(tree, selectedId) : null;

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

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Build breadcrumb from pathstring
  const breadcrumbs = selectedCategory?.pathstring
    ? selectedCategory.pathstring.split("/").filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Part Categories
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Organize parts into hierarchical categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/categories/new")}>
            <PlusIcon className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Category Tree */}
        <div className="lg:col-span-4">
          <Card>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Category Tree
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
                  <FolderIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No categories yet
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate("/categories/new")}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Create First Category
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: Selected Category Details */}
        <div className="lg:col-span-8 space-y-6">
          {selectedId && selectedCategory ? (
            <>
              {/* Breadcrumb */}
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FolderIcon className="h-4 w-4" />
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

              {/* Category Info Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {selectedCategory.name}
                      </h2>
                      {selectedCategory.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedCategory.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/categories/${selectedId}/edit`)
                      }
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-muted-foreground">
                        Subcategories:
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedCategory.children_count ?? selectedCategory.children?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CpuChipIcon className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-muted-foreground">
                        Parts:
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedCategory.parts_count ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Child Categories */}
              {childCategories && childCategories.length > 0 && (
                <Card>
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">
                      Subcategories
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {childCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleSelect(cat.id)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-accent transition-colors"
                      >
                        <FolderIcon className="h-5 w-5 text-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        {cat.parts_count !== undefined && (
                          <Badge color="gray">{cat.parts_count} parts</Badge>
                        )}
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Parts in this category */}
              <Card>
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Parts
                  </h3>
                </div>
                {componentData && componentData.items && componentData.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-card border-b border-border">
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            MPN
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Location
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {componentData.items.map((comp) => (
                          <tr
                            key={comp.id}
                            onClick={() => navigate(`/inventory/${comp.id}`)}
                            className="cursor-pointer hover:bg-accent transition-colors"
                          >
                            <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                              <Link
                                to={`/inventory/${comp.id}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {comp.name}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                              {comp.mpn || "-"}
                            </td>
                            <td className="px-6 py-4 text-foreground whitespace-nowrap">
                              {comp.quantity}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                              {comp.location || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CpuChipIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No parts in this category
                    </p>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center py-24">
              <div className="text-center">
                <FolderIcon className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Select a category from the tree to view its details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
