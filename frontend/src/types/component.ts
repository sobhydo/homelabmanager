export interface Component {
  id: number;
  name: string;
  description?: string;
  manufacturer_part_number?: string;
  supplier_part_number?: string;
  mpn?: string;
  manufacturer?: string;
  category?: string;
  subcategory?: string;
  package_type?: string;
  quantity: number;
  min_quantity: number;
  location?: string;
  datasheet_url?: string;
  unit_price?: number;
  supplier?: string;
  notes?: string;
  category_id?: number | null;
  footprint_id?: number | null;
  tags?: string | null;
  ipn?: string | null;
  is_favorite?: boolean;
  status?: string | null;
  category_name?: string | null;
  footprint_name?: string | null;
  min_order_quantity?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentCreate {
  name: string;
  description?: string;
  manufacturer_part_number?: string;
  supplier_part_number?: string;
  mpn?: string;
  manufacturer?: string;
  category?: string;
  subcategory?: string;
  package_type?: string;
  quantity?: number;
  min_quantity?: number;
  location?: string;
  datasheet_url?: string;
  unit_price?: number;
  supplier?: string;
  notes?: string;
  category_id?: number | null;
  footprint_id?: number | null;
  tags?: string;
  ipn?: string;
  is_favorite?: boolean;
  status?: string;
  min_order_quantity?: number;
}

export type ComponentUpdate = Partial<ComponentCreate>;

export interface StockTransaction {
  id: number;
  component_id: number;
  quantity_change: number;
  reason: string;
  reference?: string;
  created_at: string;
}

export const COMPONENT_CATEGORIES = [
  "Resistor",
  "Capacitor",
  "Inductor",
  "Diode",
  "Transistor",
  "IC",
  "Connector",
  "LED",
  "Crystal",
  "Relay",
  "Switch",
  "Fuse",
  "Sensor",
  "Module",
  "PCB",
  "Mechanical",
  "Cable",
  "Other",
] as const;
