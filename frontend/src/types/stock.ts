export interface StockLocation {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  pathstring: string | null;
  created_at: string;
  children_count?: number;
  items_count?: number;
}

export interface StockLocationCreate {
  name: string;
  description?: string;
  parent_id?: number | null;
}

export interface StockLocationUpdate extends Partial<StockLocationCreate> {}

export interface StockLocationTree extends StockLocation {
  children: StockLocationTree[];
}

export interface StockItem {
  id: number;
  component_id: number;
  location_id: number | null;
  quantity: number;
  serial_number: string | null;
  batch: string | null;
  notes: string | null;
  status: string;
  expiry_date: string | null;
  component_name: string;
  location_name: string | null;
  created_at: string;
}

export interface StockItemCreate {
  component_id: number;
  location_id?: number;
  quantity: number;
  serial_number?: string;
  batch?: string;
  notes?: string;
  status?: string;
}

export interface StockItemUpdate extends Partial<StockItemCreate> {}
