export interface BuildOrder {
  id: number;
  reference: string;
  bom_id: number;
  title: string;
  description: string | null;
  quantity: number;
  completed_quantity: number;
  status: string;
  priority: number;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  bom_name: string;
  created_at: string;
}

export interface BuildOrderCreate {
  bom_id: number;
  title: string;
  description?: string;
  quantity: number;
  priority?: number;
  target_date?: string;
  notes?: string;
}

export interface BuildOrderUpdate extends Partial<BuildOrderCreate> {}

export interface BuildAllocation {
  id: number;
  build_order_id: number;
  bom_item_id: number;
  stock_item_id: number | null;
  component_id: number;
  quantity: number;
  component_name: string;
  created_at: string;
}

export interface BuildOutput {
  id: number;
  build_order_id: number;
  quantity: number;
  serial_number: string | null;
  notes: string | null;
  completed_at: string;
}
