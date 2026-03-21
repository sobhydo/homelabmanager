export interface Footprint {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string;
}

export interface FootprintCreate {
  name: string;
  description?: string;
  category?: string;
  image_url?: string;
}

export interface FootprintUpdate extends Partial<FootprintCreate> {}
