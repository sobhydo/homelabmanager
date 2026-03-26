import { useState } from "react";
import toast from "react-hot-toast";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMachines } from "../../api/machines";
import {
  useFeeders,
  useCreateFeeder,
  useUpdateFeeder,
  useDeleteFeeder,
} from "../../api/feeders";
import type { Feeder, FeederCreate } from "../../types/feeder";
import type { Component } from "../../types/component";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import Select from "../../components/ui/select";
import ComponentPicker from "../../components/ui/ComponentPicker";

export default function FeederConfig() {
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
    null
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Feeder>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<FeederCreate>>({
    slot_number: 1,
    nozzle: 1,
    mount_speed: 100,
    head: 0,
    pick_height: 0,
    place_height: 0,
  });
  const [addSelectedComponent, setAddSelectedComponent] =
    useState<Component | null>(null);
  const [editSelectedComponent, setEditSelectedComponent] =
    useState<Component | null>(null);

  const { data: machinesData } = useMachines({ page_size: 200 });
  const pnpMachines = (machinesData?.items || []).filter(
    (m) => m.machine_type === "Pick & Place"
  );

  const { data: feedersData, isLoading } = useFeeders(
    selectedMachineId ?? undefined
  );
  const feeders = feedersData?.items || [];

  const createMutation = useCreateFeeder();
  const updateMutation = useUpdateFeeder();
  const deleteMutation = useDeleteFeeder();

  const machineOptions = pnpMachines.map((m) => ({
    value: String(m.id),
    label: `${m.name}${m.model ? ` (${m.model})` : ""}`,
  }));

  function handleAddComponentSelect(comp: Component | null) {
    setAddSelectedComponent(comp);
    if (comp) {
      setAddForm((prev) => ({
        ...prev,
        component_value: comp.name,
        component_package: comp.package_type || prev.component_package,
        part_number: comp.mpn || comp.manufacturer_part_number || prev.part_number,
        supplier_part_number: comp.supplier_part_number || prev.supplier_part_number,
      }));
    }
  }

  function handleEditComponentSelect(comp: Component | null) {
    setEditSelectedComponent(comp);
    if (comp) {
      setEditForm((prev) => ({
        ...prev,
        component_value: comp.name,
        component_package: comp.package_type || prev.component_package,
        part_number: comp.mpn || comp.manufacturer_part_number || prev.part_number,
        supplier_part_number: comp.supplier_part_number || prev.supplier_part_number,
      }));
    }
  }

  function handleAdd() {
    if (!selectedMachineId) return;
    if (!addForm.slot_number) {
      toast.error("Slot number is required");
      return;
    }
    createMutation.mutate(
      { ...addForm, machine_id: selectedMachineId } as FeederCreate,
      {
        onSuccess: () => {
          toast.success(`Feeder slot ${addForm.slot_number} added`);
          setShowAdd(false);
          setAddSelectedComponent(null);
          setAddForm({
            slot_number: (addForm.slot_number || 1) + 1,
            nozzle: 1,
            mount_speed: 100,
            head: 0,
            pick_height: 0,
            place_height: 0,
          });
        },
      }
    );
  }

  function startEdit(feeder: Feeder) {
    setEditingId(feeder.id);
    setEditForm({ ...feeder });
    setEditSelectedComponent(null);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    const { id, machine_id, created_at, updated_at, ...payload } = editForm as Feeder;
    updateMutation.mutate(
      { id: editingId, payload },
      {
        onSuccess: () => {
          toast.success("Feeder updated");
          setEditingId(null);
        },
      }
    );
  }

  function handleDelete(feeder: Feeder) {
    if (!confirm(`Delete feeder slot ${feeder.slot_number}?`)) return;
    deleteMutation.mutate(feeder.id, {
      onSuccess: () => toast.success("Feeder deleted"),
    });
  }

  const inputClass =
    "h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feeder Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure what components are loaded on each feeder slot of your
            Pick &amp; Place machine
          </p>
        </div>
      </div>

      {/* Machine selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="w-80">
              <Select
                label="Pick & Place Machine"
                name="machine"
                value={selectedMachineId ? String(selectedMachineId) : ""}
                onChange={(e) =>
                  setSelectedMachineId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                options={machineOptions}
                placeholder="Select a P&P machine..."
              />
            </div>
            {pnpMachines.length === 0 && (
              <p className="text-sm text-muted-foreground pb-2">
                No Pick &amp; Place machines found. Add one in the Machines
                section first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feeder table */}
      {selectedMachineId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Feeder Slots{" "}
              <Badge className="ml-2">{feeders.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Feeder
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add row */}
            {showAdd && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="text-sm font-medium">New Feeder Slot</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Slot #
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className={inputClass + " w-full"}
                      value={addForm.slot_number || ""}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          slot_number: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-2 lg:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      Component
                    </label>
                    <ComponentPicker
                      value={addSelectedComponent}
                      onChange={handleAddComponentSelect}
                      placeholder="Search components..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Package
                    </label>
                    <input
                      className={inputClass + " w-full"}
                      placeholder="e.g. 0402"
                      value={addForm.component_package || ""}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          component_package: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Part #
                    </label>
                    <input
                      className={inputClass + " w-full"}
                      placeholder="MPN"
                      value={addForm.part_number || ""}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          part_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Supplier Part #
                    </label>
                    <input
                      className={inputClass + " w-full"}
                      placeholder="SPN"
                      value={addForm.supplier_part_number || ""}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          supplier_part_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Nozzle
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className={inputClass + " w-full"}
                      value={addForm.nozzle || 1}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          nozzle: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Speed %
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={inputClass + " w-full"}
                      value={addForm.mount_speed || 100}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          mount_speed: parseInt(e.target.value) || 100,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Head
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      className={inputClass + " w-full"}
                      value={addForm.head || 0}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          head: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <input
                    className={inputClass + " w-full"}
                    placeholder="Optional notes..."
                    value={addForm.notes || ""}
                    onChange={(e) =>
                      setAddForm({ ...addForm, notes: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : feeders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feeders configured yet. Click "Add Feeder" to set up your
                first slot.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                      <th className="text-left py-2 pr-3">Slot</th>
                      <th className="text-left py-2 pr-3">Value</th>
                      <th className="text-left py-2 pr-3">Package</th>
                      <th className="text-left py-2 pr-3">Part #</th>
                      <th className="text-left py-2 pr-3">Supplier Part #</th>
                      <th className="text-left py-2 pr-3">Nozzle</th>
                      <th className="text-left py-2 pr-3">Speed</th>
                      <th className="text-left py-2 pr-3">Head</th>
                      <th className="text-left py-2 pr-3">Notes</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeders.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                      >
                        {editingId === f.id ? (
                          <>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={1}
                                className={inputClass + " w-16"}
                                value={editForm.slot_number || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    slot_number:
                                      parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3" colSpan={2}>
                              <ComponentPicker
                                value={editSelectedComponent}
                                onChange={handleEditComponentSelect}
                                placeholder={editForm.component_value || "Search..."}
                                inputClassName="w-48"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                className={inputClass + " w-24"}
                                value={editForm.part_number || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    part_number: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                className={inputClass + " w-24"}
                                value={editForm.supplier_part_number || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    supplier_part_number: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={1}
                                className={inputClass + " w-14"}
                                value={editForm.nozzle || 1}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    nozzle: parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                className={inputClass + " w-16"}
                                value={editForm.mount_speed || 100}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    mount_speed:
                                      parseInt(e.target.value) || 100,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                className={inputClass + " w-14"}
                                value={editForm.head || 0}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    head: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                className={inputClass + " w-32"}
                                value={editForm.notes || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    notes: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-emerald-500"
                                  onClick={handleSaveEdit}
                                >
                                  <CheckIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingId(null)}
                                >
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 pr-3 font-mono font-semibold">
                              {f.slot_number}
                            </td>
                            <td className="py-2 pr-3">
                              {f.component_value || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {f.component_package ? (
                                <Badge variant="outline">
                                  {f.component_package}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">
                              {f.part_number || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">
                              {f.supplier_part_number || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3">{f.nozzle}</td>
                            <td className="py-2 pr-3">{f.mount_speed}%</td>
                            <td className="py-2 pr-3">{f.head}</td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[200px] truncate">
                              {f.notes || "—"}
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => startEdit(f)}
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(f)}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
