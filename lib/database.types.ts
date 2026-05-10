export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderStatus =
  | "Novo"
  | "Separando"
  | "Pronto"
  | "Finalizado"
  | "Recebido"
  | "Pendente"
  | "Divergente"
  | "Em conciliação"
  | "Cancelado";

export type OperationStage = "Novo" | "Separando" | "Pronto";
export type UserRole = "admin" | "financeiro" | "operador";

export type PlatformRow = {
  id: string;
  name: string;
  type?: string | null;
  percent_fee: number;
  transaction_fee?: number | null;
  logistics_fee?: number | null;
  advance_fee?: number | null;
  fixed_fee: number;
  monthly_fee?: number | null;
  payout_days: number;
  delivery_type?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
};

export type OrderRow = {
  id: string;
  platform_id: string | null;
  order_number: string;
  customer_name: string;
  gross_amount: number;
  fees_amount: number;
  net_amount: number;
  status: OrderStatus;
  operation_stage?: OperationStage | null;
  products_description?: string | null;
  discount_amount?: number | null;
  other_deductions?: number | null;
  installments?: number | null;
  delivery_method?: string | null;
  deadline_days?: number | null;
  notes?: string | null;
  external_order_id?: string | null;
  raw_payload?: Json | null;
  imported_from?: string | null;
  imported_at?: string | null;
  ordered_at: string;
  created_at: string;
  platforms?: Pick<PlatformRow, "id" | "name"> | null;
  order_items?: OrderItemRow[];
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type FinancialEntryRow = {
  id: string;
  order_id: string | null;
  platform_id: string | null;
  description: string;
  due_date: string;
  expected_amount: number;
  received_amount: number;
  status: OrderStatus;
  created_at: string;
  platforms?: Pick<PlatformRow, "id" | "name"> | null;
  orders?: Pick<OrderRow, "id" | "order_number" | "customer_name"> | null;
};

export type ReconciliationRow = {
  id: string;
  order_id: string | null;
  financial_entry_id: string | null;
  expected_amount: number;
  received_amount: number;
  difference_amount: number;
  status: OrderStatus;
  notes: string | null;
  history: Json;
  created_at: string;
  updated_at: string;
  orders?: Pick<OrderRow, "id" | "order_number" | "customer_name"> | null;
  financial_entries?: Pick<FinancialEntryRow, "id" | "description"> | null;
};

export type UploadedFileRow = {
  id: string;
  order_id?: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  category?: string | null;
  mime_type: string | null;
  file_size: number | null;
  ocr_status: string;
  ocr_confidence?: number | null;
  ai_processed?: boolean | null;
  ai_raw_response?: Json | null;
  parsed_payload?: Json | null;
  extracted_text: string | null;
  created_by: string | null;
  created_at: string;
};

export type UserProfileRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
};
