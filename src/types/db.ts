import type { ImageType, OrderStatus, Role } from "@/lib/constants";

export interface UserRow {
  id: string;
  phone: string;
  role: Role;
  created_at: string;
  deleted_at: string | null;
}

export interface ClientProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface MasterProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  description: string | null;
  avatar_url: string | null;
  document_url: string | null;
  trust_score: number;
  rating: number;
  reviews_count: number;
  completed_orders: number;
  phone_verified: boolean;
  id_verified: boolean;
  is_online: boolean;
}

export interface SpecializationRow {
  id: string;
  name: string;
}

export interface OrderRow {
  id: string;
  client_id: string;
  specialization_id: string;
  title: string;
  description: string | null;
  budget: number | null;
  address: string;
  status: OrderStatus;
  is_urgent: boolean;
  selected_master: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface ApplicationRow {
  id: string;
  order_id: string;
  master_id: string;
  price: number;
  estimated_days: number;
  comment: string | null;
  created_at: string;
}

export interface OrderImageRow {
  id: string;
  order_id: string;
  image_url: string;
  type: ImageType;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  order_id: string;
  client_id: string;
  master_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface FavoriteRow {
  client_id: string;
  master_id: string;
  created_at: string;
}

export interface WarrantyRow {
  id: string;
  order_id: string;
  master_id: string;
  client_id: string;
  warranty_period: number;
  expires_at: string;
  created_at: string;
}

export interface WarrantyCertificateRow {
  id: string;
  warranty_id: string;
  certificate_number: string;
  work_title: string;
  total_price: number;
  before_photo: string | null;
  after_photo: string | null;
  created_at: string;
}

export interface AdminLogRow {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

/* ---- Composite shapes returned by the API (joins) ---- */

export interface MasterPublic extends MasterProfileRow {
  specializations: SpecializationRow[];
  phone?: string;
}

export interface OrderWithRelations extends OrderRow {
  specialization: SpecializationRow | null;
  client: ClientProfileRow | null;
  master: MasterProfileRow | null;
  images: OrderImageRow[];
  applications_count?: number;
}

export interface ApplicationWithRelations extends ApplicationRow {
  master: MasterProfileRow | null;
  order?: OrderRow | null;
}

export interface ReviewWithRelations extends ReviewRow {
  client: ClientProfileRow | null;
  order?: OrderRow | null;
}

export interface WarrantyWithRelations extends WarrantyRow {
  order: OrderRow | null;
  master: MasterProfileRow | null;
  client: ClientProfileRow | null;
  certificate: WarrantyCertificateRow | null;
}
