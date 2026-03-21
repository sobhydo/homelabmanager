export interface Attachment {
  id: number;
  filename: string;
  filepath: string;
  file_size: number | null;
  mime_type: string | null;
  attachment_type: string;
  entity_type: string;
  entity_id: number;
  is_primary: boolean;
  description: string | null;
  created_at: string;
}
