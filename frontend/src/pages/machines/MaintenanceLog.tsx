import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { PlusIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  useMachine,
  useMaintenanceTasks,
  useCreateMaintenanceTask,
  useUpdateMaintenanceTask,
} from "../../api/machines";
import type { MaintenanceTaskCreate } from "../../types/machine";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/shared/StatusBadge";
import Badge from "../../components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const priorityColors: Record<string, "gray" | "blue" | "yellow" | "orange" | "red"> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  critical: "red",
};

export default function MaintenanceLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const machineId = Number(id);

  const { data: machine } = useMachine(machineId);
  const { data: tasks, isLoading } = useMaintenanceTasks(machineId);
  const createMutation = useCreateMaintenanceTask();
  const updateMutation = useUpdateMaintenanceTask(machineId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<MaintenanceTaskCreate, "machine_id">>({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    scheduled_date: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleCreate = async () => {
    if (!form.title) {
      toast.error("Title is required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...form,
        machine_id: machineId,
      } as MaintenanceTaskCreate);
      toast.success("Maintenance task created.");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        scheduled_date: "",
        notes: "",
      });
    } catch {
      // handled
    }
  };

  const handleComplete = async (taskId: number) => {
    try {
      await updateMutation.mutateAsync({
        taskId,
        payload: {
          status: "completed",
          completed_date: new Date().toISOString().split("T")[0],
        },
      });
      toast.success("Task marked as completed.");
    } catch {
      // handled
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/machines/${id}`)}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Machine
        </Button>
        <div className="flex-1">
          {machine && (
            <h1 className="text-xl font-semibold text-foreground">
              {machine.name} - Maintenance Log
            </h1>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full" />
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                    <StatusBadge status={task.status} />
                    <Badge color={priorityColors[task.priority] || "gray"}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.scheduled_date && (
                      <span>Scheduled: {format(new Date(task.scheduled_date), "MMM d, yyyy")}</span>
                    )}
                    {task.completed_date && (
                      <span>Completed: {format(new Date(task.completed_date), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </div>
                {task.status !== "completed" && (
                  <Button variant="secondary" size="sm" onClick={() => handleComplete(task.id)}>
                    Mark Complete
                  </Button>
                )}
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
          <p className="text-muted-foreground text-sm">
            No maintenance tasks recorded for this machine.
          </p>
          </CardContent>
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Maintenance Task"
        size="lg"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Create Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" name="title" value={form.title} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" name="priority" value={form.priority} onChange={handleChange} options={priorityOptions} />
            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={statusOptions} />
            <Input label="Scheduled Date" name="scheduled_date" type="date" value={form.scheduled_date} onChange={handleChange} />
          </div>
          <div>
            <Label className="mb-1.5">Description</Label>
            <Textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
