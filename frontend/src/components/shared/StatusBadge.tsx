import Badge from "../ui/badge";

type StatusType =
  | "online"
  | "offline"
  | "active"
  | "expired"
  | "trial"
  | "cancelled"
  | "paused"
  | "maintenance"
  | "error"
  | "connected"
  | "disconnected"
  | "running"
  | "stopped"
  | "pending"
  | "processed"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "overdue"
  | "new"
  | "good"
  | "fair"
  | "poor"
  | "broken";

const statusConfig: Record<
  StatusType,
  { color: "green" | "red" | "yellow" | "blue" | "gray" | "orange" | "indigo" | "purple"; label: string }
> = {
  online: { color: "green", label: "Online" },
  offline: { color: "red", label: "Offline" },
  active: { color: "green", label: "Active" },
  expired: { color: "red", label: "Expired" },
  trial: { color: "yellow", label: "Trial" },
  cancelled: { color: "gray", label: "Cancelled" },
  paused: { color: "yellow", label: "Paused" },
  maintenance: { color: "orange", label: "Maintenance" },
  error: { color: "red", label: "Error" },
  connected: { color: "green", label: "Connected" },
  disconnected: { color: "red", label: "Disconnected" },
  running: { color: "green", label: "Running" },
  stopped: { color: "gray", label: "Stopped" },
  pending: { color: "yellow", label: "Pending" },
  processed: { color: "green", label: "Processed" },
  scheduled: { color: "blue", label: "Scheduled" },
  in_progress: { color: "indigo", label: "In Progress" },
  completed: { color: "green", label: "Completed" },
  overdue: { color: "red", label: "Overdue" },
  new: { color: "green", label: "New" },
  good: { color: "green", label: "Good" },
  fair: { color: "yellow", label: "Fair" },
  poor: { color: "orange", label: "Poor" },
  broken: { color: "red", label: "Broken" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    color: "gray" as const,
    label: status,
  };

  return (
    <Badge color={config.color} dot className={className}>
      {config.label}
    </Badge>
  );
}
