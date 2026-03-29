import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlusIcon,
  DocumentIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import {
  useComponent,
  useDeleteComponent,
  useStockTransactions,
  useComponentParameters,
  useCreateParameter,
  useDeleteParameter,
  useComponentLots,
  useCreateLot,
  useDeleteLot,
  useComponentAttachments,
  useComponentSupplierParts,
  useComponentManufacturerParts,
} from "../../api/components";
import type { PartParameterCreate } from "../../types/part_parameter";
import type { PartLotCreate } from "../../types/part_lot";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import StockIndicator from "../../components/shared/StockIndicator";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

type TabKey =
  | "overview"
  | "parameters"
  | "stock"
  | "suppliers"
  | "manufacturers"
  | "attachments"
  | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "parameters", label: "Parameters" },
  { key: "stock", label: "Stock" },
  { key: "suppliers", label: "Suppliers" },
  { key: "manufacturers", label: "Manufacturers" },
  { key: "attachments", label: "Attachments" },
  { key: "history", label: "History" },
];

const STATUS_COLORS: Record<string, "green" | "yellow" | "red" | "gray"> = {
  Active: "green",
  Discontinued: "red",
  NRND: "yellow",
  Obsolete: "gray",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ComponentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Parameter modal state
  const [showParamModal, setShowParamModal] = useState(false);
  const [paramForm, setParamForm] = useState<PartParameterCreate>({
    name: "",
    value_text: "",
    unit: "",
    symbol: "",
    group_name: "",
  });

  // Lot modal state
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotForm, setLotForm] = useState<PartLotCreate>({
    quantity: 0,
    description: "",
    needs_refill: false,
  });

  const { data: component, isLoading } = useComponent(numericId);
  const { data: transactions } = useStockTransactions(numericId);
  const { data: parameters } = useComponentParameters(numericId);
  const { data: lots } = useComponentLots(numericId);
  const { data: attachments } = useComponentAttachments(numericId);
  const { data: supplierParts } = useComponentSupplierParts(numericId);
  const { data: manufacturerParts } = useComponentManufacturerParts(numericId);

  const deleteMutation = useDeleteComponent();
  const createParamMutation = useCreateParameter(numericId);
  const deleteParamMutation = useDeleteParameter(numericId);
  const createLotMutation = useCreateLot(numericId);
  const deleteLotMutation = useDeleteLot(numericId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("Component deleted.");
      navigate("/inventory");
    } catch {
      // handled by interceptor
    }
  };

  const handleCreateParam = async () => {
    if (!paramForm.name) {
      toast.error("Parameter name is required.");
      return;
    }
    try {
      await createParamMutation.mutateAsync(paramForm);
      toast.success("Parameter added.");
      setShowParamModal(false);
      setParamForm({ name: "", value_text: "", unit: "", symbol: "", group_name: "" });
    } catch {
      // handled by interceptor
    }
  };

  const handleCreateLot = async () => {
    try {
      await createLotMutation.mutateAsync(lotForm);
      toast.success("Stock lot added.");
      setShowLotModal(false);
      setLotForm({ quantity: 0, description: "", needs_refill: false });
    } catch {
      // handled by interceptor
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!component) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">Component not found.</p>
        <Link to="/inventory" className="text-primary hover:underline text-sm">
          Back to components
        </Link>
      </div>
    );
  }

  const totalLotStock = lots?.reduce((sum, lot) => sum + lot.quantity, 0) ?? 0;
  const tags = component.tags ? component.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => navigate(`/inventory/${id}/edit`)}>
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Component Header Card */}
      <Card>
        <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-foreground">
                  {component.name}
                </h1>
                {component.is_favorite && (
                  <StarSolidIcon className="h-5 w-5 text-yellow-500" />
                )}
                <Badge color="indigo">{component.category_name || component.category}</Badge>
                {component.status && (
                  <Badge color={STATUS_COLORS[component.status] || "gray"}>
                    {component.status}
                  </Badge>
                )}
              </div>
              {component.description && (
                <p className="text-sm text-muted-foreground mb-2">{component.description}</p>
              )}
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tags.map((tag) => (
                    <Badge key={tag} color="blue">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <StockIndicator
              quantity={component.quantity}
              minimumStock={component.min_quantity}
            />
          </div>
        </div>

        {/* Quick info row */}
        <Separator className="my-4" />
        <div className="pt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {component.mpn && (
            <div>
              <span className="text-muted-foreground">MPN:</span>{" "}
              <span className="text-foreground font-mono">{component.mpn}</span>
            </div>
          )}
          {component.ipn && (
            <div>
              <span className="text-muted-foreground">IPN:</span>{" "}
              <span className="text-foreground font-mono">{component.ipn}</span>
            </div>
          )}
          {component.footprint_name && (
            <div>
              <span className="text-muted-foreground">Footprint:</span>{" "}
              <span className="text-foreground">{component.footprint_name}</span>
            </div>
          )}
          {component.manufacturer && (
            <div>
              <span className="text-muted-foreground">Manufacturer:</span>{" "}
              <span className="text-foreground">{component.manufacturer}</span>
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
              }`}
            >
              {tab.label}
              {tab.key === "parameters" && parameters && parameters.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">({parameters.length})</span>
              )}
              {tab.key === "stock" && lots && lots.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">({lots.length})</span>
              )}
              {tab.key === "suppliers" && supplierParts && supplierParts.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">({supplierParts.length})</span>
              )}
              {tab.key === "attachments" && attachments && attachments.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">({attachments.length})</span>
              )}
              {tab.key === "history" && transactions && transactions.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">({transactions.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* --- Overview Tab --- */}
        {activeTab === "overview" && (
          <Card>
            <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">MPN</p>
                <p className="text-sm text-foreground font-mono">{component.mpn || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">IPN</p>
                <p className="text-sm text-foreground font-mono">{component.ipn || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Manufacturer</p>
                <p className="text-sm text-foreground">{component.manufacturer || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Category</p>
                <p className="text-sm text-foreground">{component.category_name || component.category || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Footprint</p>
                <p className="text-sm text-foreground">{component.footprint_name || component.package_type || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Location</p>
                <p className="text-sm text-foreground">{component.location || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Unit Price</p>
                <p className="text-sm text-foreground">
                  {component.unit_price
                    ? `${component.unit_price}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Min Order Qty</p>
                <p className="text-sm text-foreground">{component.min_order_quantity ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                <p className="text-sm">
                  {component.status ? (
                    <Badge color={STATUS_COLORS[component.status] || "gray"}>{component.status}</Badge>
                  ) : (
                    <span className="text-foreground">-</span>
                  )}
                </p>
              </div>
              {component.datasheet_url && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Datasheet</p>
                  <a
                    href={component.datasheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View Datasheet
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {component.notes && (
              <>
                <Separator className="mt-6" />
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{component.notes}</p>
                </div>
              </>
            )}
            </CardContent>
          </Card>
        )}

        {/* --- Parameters Tab --- */}
        {activeTab === "parameters" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Part Parameters</CardTitle>
              <Button size="sm" onClick={() => setShowParamModal(true)}>
                <PlusIcon className="h-4 w-4" />
                Add Parameter
              </Button>
            </CardHeader>
            {parameters && parameters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Group</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parameters.map((param) => (
                      <tr key={param.id} className="hover:bg-accent transition-colors">
                        <td className="px-6 py-3 text-foreground font-medium">{param.name}</td>
                        <td className="px-6 py-3 text-muted-foreground font-mono">{param.symbol || "-"}</td>
                        <td className="px-6 py-3 text-foreground">
                          {param.value_text ||
                            (param.value_typical !== null ? String(param.value_typical) : null) ||
                            (param.value_min !== null && param.value_max !== null
                              ? `${param.value_min} - ${param.value_max}`
                              : "-")}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{param.unit || "-"}</td>
                        <td className="px-6 py-3 text-muted-foreground">{param.group_name || "-"}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => deleteParamMutation.mutate(param.id)}
                            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-red-600 hover:bg-accent transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No parameters defined for this part.</p>
              </div>
            )}
          </Card>
        )}

        {/* --- Stock Tab --- */}
        {activeTab === "stock" && (
          <div className="space-y-4">
            {/* Total stock summary */}
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Stock (lots)</p>
                  <p className="text-2xl font-semibold text-foreground">{totalLotStock}</p>
                </div>
                <div className="h-8 border-l border-border" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Component Stock</p>
                  <p className="text-2xl font-semibold text-foreground">{component.quantity}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowLotModal(true)}>
                <PlusIcon className="h-4 w-4" />
                Add Lot
              </Button>
              </CardContent>
            </Card>

            <Card>
              {lots && lots.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-card border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lots.map((lot) => (
                        <tr key={lot.id} className="hover:bg-accent transition-colors">
                          <td className="px-6 py-3 text-foreground">{lot.location_name || "-"}</td>
                          <td className="px-6 py-3 text-foreground font-semibold">{lot.quantity}</td>
                          <td className="px-6 py-3 text-muted-foreground">{lot.description || "-"}</td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {lot.expiry_date ? format(new Date(lot.expiry_date), "MMM d, yyyy") : "-"}
                          </td>
                          <td className="px-6 py-3">
                            {lot.needs_refill ? (
                              <Badge color="yellow" dot>Needs Refill</Badge>
                            ) : (
                              <Badge color="green" dot>OK</Badge>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => deleteLotMutation.mutate(lot.id)}
                              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-red-600 hover:bg-accent transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No stock lots for this part.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* --- Suppliers Tab --- */}
        {activeTab === "suppliers" && (
          <Card>
            <CardHeader>
              <CardTitle>Supplier Parts</CardTitle>
            </CardHeader>
            {supplierParts && supplierParts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pack Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierParts.map((sp) => (
                      <tr key={sp.id} className="hover:bg-accent transition-colors">
                        <td className="px-6 py-3 text-foreground font-medium">
                          <Link
                            to={`/suppliers/${sp.supplier_id}`}
                            className="text-primary hover:underline"
                          >
                            {sp.supplier_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-foreground font-mono text-xs">
                          {sp.supplier_part_number || "-"}
                        </td>
                        <td className="px-6 py-3 text-foreground">
                          {sp.unit_price !== null ? `${sp.unit_price} ${sp.currency}` : "-"}
                        </td>
                        <td className="px-6 py-3 text-foreground">{sp.pack_quantity}</td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {sp.lead_time_days ? `${sp.lead_time_days} days` : "-"}
                        </td>
                        <td className="px-6 py-3">
                          {sp.url ? (
                            <a
                              href={sp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Link
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No supplier parts linked.</p>
              </div>
            )}
          </Card>
        )}

        {/* --- Manufacturers Tab --- */}
        {activeTab === "manufacturers" && (
          <Card>
            <CardHeader>
              <CardTitle>Manufacturer Parts</CardTitle>
            </CardHeader>
            {manufacturerParts && manufacturerParts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Manufacturer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">MPN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manufacturerParts.map((mp) => (
                      <tr key={mp.id} className="hover:bg-accent transition-colors">
                        <td className="px-6 py-3 text-foreground font-medium">
                          <Link
                            to={`/manufacturers/${mp.manufacturer_id}`}
                            className="text-primary hover:underline"
                          >
                            {mp.manufacturer_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-foreground font-mono text-xs">
                          {mp.manufacturer_part_number}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{mp.description || "-"}</td>
                        <td className="px-6 py-3">
                          {mp.url ? (
                            <a
                              href={mp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Link
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No manufacturer parts linked.</p>
              </div>
            )}
          </Card>
        )}

        {/* --- Attachments Tab --- */}
        {activeTab === "attachments" && (
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            {attachments && attachments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Filename</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attachments.map((att) => (
                      <tr key={att.id} className="hover:bg-accent transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <DocumentIcon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                            <span className="text-foreground font-medium">{att.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <Badge color="gray">{att.attachment_type}</Badge>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{formatFileSize(att.file_size)}</td>
                        <td className="px-6 py-3 text-muted-foreground">{att.description || "-"}</td>
                        <td className="px-6 py-3">
                          {att.is_primary ? (
                            <Badge color="blue" dot>Primary</Badge>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
              </div>
            )}
          </Card>
        )}

        {/* --- History Tab --- */}
        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle>Stock Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Change</th>
                      <th className="pb-3 pr-4">Reason</th>
                      <th className="pb-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-accent transition-colors">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`font-semibold ${
                              tx.quantity_change > 0 ? "text-primary" : "text-red-400"
                            }`}
                          >
                            {tx.quantity_change > 0 ? "+" : ""}
                            {tx.quantity_change}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-foreground">{tx.reason}</td>
                        <td className="py-3 text-muted-foreground">{tx.reference || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No stock transactions recorded.</p>
            )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Component"
        message={`Are you sure you want to delete "${component.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

      {/* Add Parameter Modal */}
      <Modal
        open={showParamModal}
        onClose={() => setShowParamModal(false)}
        title="Add Parameter"
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowParamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateParam} loading={createParamMutation.isPending}>
              Add Parameter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={paramForm.name}
              onChange={(e) => setParamForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Resistance"
              required
            />
            <Input
              label="Symbol"
              value={paramForm.symbol || ""}
              onChange={(e) => setParamForm((p) => ({ ...p, symbol: e.target.value }))}
              placeholder="e.g. R"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value"
              value={paramForm.value_text || ""}
              onChange={(e) => setParamForm((p) => ({ ...p, value_text: e.target.value }))}
              placeholder="e.g. 10k"
            />
            <Input
              label="Unit"
              value={paramForm.unit || ""}
              onChange={(e) => setParamForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="e.g. Ohm"
            />
          </div>
          <Input
            label="Group"
            value={paramForm.group_name || ""}
            onChange={(e) => setParamForm((p) => ({ ...p, group_name: e.target.value }))}
            placeholder="e.g. Electrical"
          />
        </div>
      </Modal>

      {/* Add Lot Modal */}
      <Modal
        open={showLotModal}
        onClose={() => setShowLotModal(false)}
        title="Add Stock Lot"
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowLotModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLot} loading={createLotMutation.isPending}>
              Add Lot
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Quantity"
            type="number"
            value={lotForm.quantity}
            onChange={(e) => setLotForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
            min={0}
          />
          <Input
            label="Description"
            value={lotForm.description || ""}
            onChange={(e) => setLotForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional description"
          />
          <Input
            label="Expiry Date"
            type="date"
            value={lotForm.expiry_date || ""}
            onChange={(e) => setLotForm((p) => ({ ...p, expiry_date: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="needs_refill"
              checked={lotForm.needs_refill || false}
              onCheckedChange={(checked) => setLotForm((p) => ({ ...p, needs_refill: !!checked }))}
            />
            <Label htmlFor="needs_refill" className="cursor-pointer">Needs Refill</Label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
