export interface Feeder {
  id: number;
  machine_id: number;
  slot_number: number;
  component_value?: string;
  component_package?: string;
  part_number?: string;
  nozzle: number;
  pick_height: number;
  place_height: number;
  mount_speed: number;
  head: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeederCreate {
  machine_id: number;
  slot_number: number;
  component_value?: string;
  component_package?: string;
  part_number?: string;
  nozzle?: number;
  pick_height?: number;
  place_height?: number;
  mount_speed?: number;
  head?: number;
  notes?: string;
}

export type FeederUpdate = Partial<Omit<FeederCreate, "machine_id">>;

export interface FeederListResponse {
  items: Feeder[];
  total: number;
}
