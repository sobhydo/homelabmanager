export interface SavedFile {
  id: number;
  name: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  category: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
