export interface Machine {
  id: number;
  name: string;
  description?: string;
  machine_type?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status: string;
  ip_address?: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  specs?: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineCreate {
  name: string;
  description?: string;
  machine_type?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status?: string;
  ip_address?: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  specs?: Record<string, unknown>;
  notes?: string;
}

export type MachineUpdate = Partial<MachineCreate>;

export interface MaintenanceTask {
  id: number;
  machine_id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  scheduled_date?: string;
  completed_date?: string;
  recurrence_days?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTaskCreate {
  machine_id: number;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  scheduled_date?: string;
  recurrence_days?: number;
  notes?: string;
}

export interface MaintenanceTaskUpdate {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  scheduled_date?: string;
  completed_date?: string;
  recurrence_days?: number;
  notes?: string;
}

export const MACHINE_TYPES = [
  "3D Printer",
  "CNC",
  "Laser Cutter",
  "Soldering Station",
  "Oscilloscope",
  "Power Supply",
  "Server",
  "Network Switch",
  "NAS",
  "Other",
] as const;
