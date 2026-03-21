export interface Category {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  pathstring: string | null;
  default_footprint_id: number | null;
  children_count?: number;
  parts_count?: number;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  parent_id?: number | null;
  default_footprint_id?: number | null;
}

export interface CategoryUpdate extends Partial<CategoryCreate> {}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}
