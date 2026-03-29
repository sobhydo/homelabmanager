export interface BomItem {
  id: number;
  bom_id: number;
  reference_designator?: string;
  quantity: number;
  manufacturer_part_number?: string;
  supplier_part_number?: string;
  description?: string;
  value?: string;
  package?: string;
  component_id?: number;
  matched: number;
  created_at?: string;
}

export interface Bom {
  id: number;
  name: string;
  description?: string;
  version?: string;
  status: string;
  source_file?: string;
  total_cost?: number;
  items: BomItem[];
  created_at: string;
  updated_at: string;
}

export interface BomCreate {
  name: string;
  description?: string;
}

export interface BomItemAvailability {
  bom_item_id: number;
  component_id?: number;
  manufacturer_part_number?: string;
  required: number;
  available: number;
  sufficient: boolean;
}

export interface BomAvailability {
  bom_id: number;
  bom_name: string;
  total_items: number;
  items: BomItemAvailability[];
  all_available: boolean;
}

export interface Invoice {
  id: number;
  invoice_number?: string;
  supplier?: string;
  total_amount?: number;
  currency: string;
  invoice_date?: string;
  file_path?: string;
  status: string;
  raw_text?: string;
  parsed_data?: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description?: string;
  part_number?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  component_id?: number;
  matched: number;
  added_to_stock: number;
  suggested_category?: string;
  suggested_package?: string;
  supplier_part_number?: string;
  created_at?: string;
}

export interface InvoiceCreate {
  invoice_number?: string;
  supplier?: string;
  total_amount?: number;
  currency?: string;
  invoice_date?: string;
}
