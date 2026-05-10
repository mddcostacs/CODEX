"use client";

import { supabase } from "@/lib/supabase";
import type {
  FinancialEntryRow,
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PlatformRow,
  ReconciliationRow,
  UploadedFileRow,
  UserProfileRow,
  UserRole
} from "@/lib/database.types";

type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  name?: unknown;
  stack?: unknown;
};

export function describeSupabaseError(error: unknown) {
  if (!error) {
    return { message: "Erro desconhecido retornado pelo Supabase.", code: undefined, details: undefined, hint: undefined };
  }

  const source = error as SupabaseLikeError;
  const fallbackMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "Erro sem mensagem retornado pelo Supabase.";

  return {
    message: typeof source.message === "string" && source.message ? source.message : fallbackMessage,
    code: typeof source.code === "string" ? source.code : undefined,
    details: typeof source.details === "string" ? source.details : undefined,
    hint: typeof source.hint === "string" ? source.hint : undefined,
    name: typeof source.name === "string" ? source.name : undefined,
    stack: typeof source.stack === "string" ? source.stack : undefined
  };
}

export function logSupabaseError(context: string, error: unknown) {
  const normalized = describeSupabaseError(error);
  console.error(context, normalized);
  return normalized;
}

function client() {
  if (!supabase) throw new Error("Supabase não configurado. Preencha o .env.local.");
  return supabase;
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "PGRST204" || message.includes("Could not find") || message.includes("column");
}

function baseOrderPayload(payload: Partial<OrderRow>) {
  return {
    platform_id: payload.platform_id ?? null,
    order_number: payload.order_number,
    customer_name: payload.customer_name,
    gross_amount: payload.gross_amount ?? 0,
    fees_amount: payload.fees_amount ?? 0,
    net_amount: payload.net_amount ?? 0,
    status: payload.status ?? "Novo",
    ordered_at: payload.ordered_at ?? new Date().toISOString()
  };
}

function basePlatformPayload(payload: Partial<PlatformRow>) {
  return {
    name: payload.name,
    percent_fee: payload.percent_fee ?? 0,
    fixed_fee: payload.fixed_fee ?? 0,
    payout_days: payload.payout_days ?? 0,
    active: payload.active ?? true
  };
}

function applyTextSearch<T>(query: T, columnList: string, search?: string) {
  if (!search?.trim()) return query;
  const searchable = query as T & { or: (filters: string) => unknown };
  return searchable.or(columnList.split(",").map((column) => `${column}.ilike.%${search.trim()}%`).join(",")) as T;
}

export const platformService = {
  async list(search = "") {
    let query = client().from("platforms").select("*").order("created_at", { ascending: false });
    query = applyTextSearch(query, "name", search);
    const { data, error } = await query;
    if (error) throw error;
    return data as PlatformRow[];
  },
  async create(payload: Omit<PlatformRow, "id" | "created_at">) {
    let { data, error } = await client().from("platforms").insert(payload).select("*").single();
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await client().from("platforms").insert(basePlatformPayload(payload)).select("*").single());
    }
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao criar plataforma", error);
      throw new Error(`Não foi possível salvar a plataforma. ${normalized.message}`);
    }
    return data as PlatformRow;
  },
  async update(id: string, payload: Partial<Omit<PlatformRow, "id" | "created_at">>) {
    let { data, error } = await client().from("platforms").update(payload).eq("id", id).select("*").single();
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await client().from("platforms").update(basePlatformPayload(payload)).eq("id", id).select("*").single());
    }
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao atualizar plataforma", error);
      throw new Error(`Não foi possível atualizar a plataforma. ${normalized.message}`);
    }
    return data as PlatformRow;
  },
  async remove(id: string) {
    const { error } = await client().from("platforms").delete().eq("id", id);
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao listar pedidos", error);
      throw new Error(`Não foi possível carregar pedidos. ${normalized.message}`);
    }
  }
};

export const orderService = {
  async list(filters: { search?: string; platformId?: string; status?: string } = {}) {
    let query = client()
      .from("orders")
      .select("*, platforms(id,name), order_items(*)")
      .order("ordered_at", { ascending: false });
    query = applyTextSearch(query, "order_number,customer_name,status", filters.search);
    if (filters.platformId) query = query.eq("platform_id", filters.platformId);
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return data as OrderRow[];
  },
  async create(payload: Omit<OrderRow, "id" | "created_at" | "platforms" | "order_items">, items: Omit<OrderItemRow, "id" | "order_id" | "created_at">[] = []) {
    let { data, error } = await client().from("orders").insert(payload).select("*").single();
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await client().from("orders").insert(baseOrderPayload(payload)).select("*").single());
    }
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao criar pedido", error);
      throw new Error(`Não foi possível salvar o pedido. ${normalized.message}`);
    }
    if (items.length) {
      const { error: itemError } = await client().from("order_items").insert(items.map((item) => ({ ...item, order_id: data.id })));
      if (itemError) {
        const normalized = logSupabaseError("[RecebeFlow] Erro ao criar itens do pedido", itemError);
        throw new Error(`Pedido criado, mas os itens não foram salvos. ${normalized.message}`);
      }
    }
    return data as OrderRow;
  },
  async update(id: string, payload: Partial<Omit<OrderRow, "id" | "created_at" | "platforms" | "order_items">>) {
    let { data, error } = await client().from("orders").update(payload).eq("id", id).select("*").single();
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await client().from("orders").update(baseOrderPayload(payload)).eq("id", id).select("*").single());
    }
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao atualizar pedido", error);
      throw new Error(`Não foi possível atualizar o pedido. ${normalized.message}`);
    }
    return data as OrderRow;
  },
  async remove(id: string) {
    const { error } = await client().from("orders").delete().eq("id", id);
    if (error) throw error;
  }
};

export const financialService = {
  async list(filters: { search?: string; status?: string } = {}) {
    let query = client()
      .from("financial_entries")
      .select("*, platforms(id,name), orders(id,order_number)")
      .order("due_date", { ascending: true });
    query = applyTextSearch(query, "description,status", filters.search);
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return data as FinancialEntryRow[];
  },
  async create(payload: Omit<FinancialEntryRow, "id" | "created_at" | "platforms" | "orders">) {
    const { data, error } = await client().from("financial_entries").insert(payload).select("*").single();
    if (error) throw error;
    return data as FinancialEntryRow;
  },
  async update(id: string, payload: Partial<Omit<FinancialEntryRow, "id" | "created_at" | "platforms" | "orders">>) {
    const { data, error } = await client().from("financial_entries").update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return data as FinancialEntryRow;
  },
  async remove(id: string) {
    const { error } = await client().from("financial_entries").delete().eq("id", id);
    if (error) throw error;
  }
};

export const reconciliationService = {
  async list(filters: { search?: string; status?: string } = {}) {
    let query = client()
      .from("reconciliations")
      .select("*, orders(id,order_number), financial_entries(id,description)")
      .order("updated_at", { ascending: false });
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data as ReconciliationRow[];
    if (!filters.search?.trim()) return rows;
    const term = filters.search.toLowerCase();
    return rows.filter((row) => `${row.orders?.order_number ?? ""} ${row.financial_entries?.description ?? ""} ${row.status}`.toLowerCase().includes(term));
  },
  async create(payload: Omit<ReconciliationRow, "id" | "created_at" | "updated_at" | "orders" | "financial_entries">) {
    const { data, error } = await client().from("reconciliations").insert(payload).select("*").single();
    if (error) throw error;
    return data as ReconciliationRow;
  },
  async update(id: string, payload: Partial<Omit<ReconciliationRow, "id" | "created_at" | "updated_at" | "orders" | "financial_entries">>) {
    const { data, error } = await client().from("reconciliations").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw error;
    return data as ReconciliationRow;
  },
  async remove(id: string) {
    const { error } = await client().from("reconciliations").delete().eq("id", id);
    if (error) throw error;
  }
};

export const userProfileService = {
  async list(search = "") {
    let query = client().from("users_profiles").select("*").order("created_at", { ascending: false });
    query = applyTextSearch(query, "name,email,role", search);
    const { data, error } = await query;
    if (error) throw error;
    return data as UserProfileRow[];
  },
  async invite(payload: { name: string; email: string; role: UserRole; password: string }) {
    const { data: currentSession } = await client().auth.getSession();
    const { data: authData, error: authError } = await client().auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { name: payload.name, role: payload.role } }
    });
    if (currentSession.session) {
      await client().auth.setSession({
        access_token: currentSession.session.access_token,
        refresh_token: currentSession.session.refresh_token
      });
    }
    if (authError) throw authError;
    if (!authData.user) throw new Error("Usuário não retornado pelo Supabase Auth.");
    return {
      id: authData.user.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      active: true,
      created_at: new Date().toISOString()
    } as UserProfileRow;
  },
  async update(id: string, payload: Partial<Pick<UserProfileRow, "name" | "role" | "active">>) {
    const { data, error } = await client().from("users_profiles").update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return data as UserProfileRow;
  },
  async remove(id: string) {
    const { error } = await client().from("users_profiles").delete().eq("id", id);
    if (error) throw error;
  }
};

export const uploadService = {
  async upload(file: File, userId?: string, options: { orderId?: string; category?: string; extractedText?: string; parsedPayload?: unknown; ocrStatus?: string } = {}) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const path = `${options.orderId ? `orders/${options.orderId}` : "recebeflow"}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await client().storage.from("uploaded-files").upload(path, file, { upsert: false });
    if (uploadError) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao enviar arquivo", uploadError);
      throw new Error(`Não foi possível enviar o arquivo. ${normalized.message}`);
    }
    const payload = {
      order_id: options.orderId ?? null,
      storage_bucket: "uploaded-files",
      storage_path: path,
      file_name: file.name,
      category: options.category ?? "ocr",
      mime_type: file.type,
      file_size: file.size,
      ocr_status: options.ocrStatus ?? "pendente de leitura",
      extracted_text: options.extractedText ?? null,
      parsed_payload: options.parsedPayload ?? {},
      created_by: userId ?? null
    };
    let { data, error } = await client().from("uploaded_files").insert(payload).select("*").single();
    if (error && isMissingColumnError(error)) {
      const fallbackPayload = {
        storage_bucket: payload.storage_bucket,
        storage_path: payload.storage_path,
        file_name: payload.file_name,
        mime_type: payload.mime_type,
        file_size: payload.file_size,
        ocr_status: payload.ocr_status,
        extracted_text: payload.extracted_text,
        created_by: payload.created_by
      };
      ({ data, error } = await client().from("uploaded_files").insert(fallbackPayload).select("*").single());
    }
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao registrar arquivo", error);
      throw new Error(`Arquivo enviado, mas não foi registrado. ${normalized.message}`);
    }
    return data as UploadedFileRow;
  },
  async listByOrder(orderId: string) {
    const query = client().from("uploaded_files").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) {
      if (isMissingColumnError(error)) return [];
      const normalized = logSupabaseError("[RecebeFlow] Erro ao listar anexos", error);
      throw new Error(`Não foi possível carregar anexos. ${normalized.message}`);
    }
    return data as UploadedFileRow[];
  },
  async update(id: string, payload: Partial<Pick<UploadedFileRow, "order_id" | "category" | "ocr_status" | "ocr_confidence" | "ai_processed" | "ai_raw_response" | "extracted_text">> & { parsed_payload?: unknown }) {
    const { data, error } = await client().from("uploaded_files").update(payload).eq("id", id).select("*").single();
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao atualizar arquivo", error);
      throw new Error(`Não foi possível atualizar o arquivo. ${normalized.message}`);
    }
    return data as UploadedFileRow;
  },
  async signedUrl(row: UploadedFileRow) {
    const { data, error } = await client().storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 60 * 10);
    if (error) {
      const normalized = logSupabaseError("[RecebeFlow] Erro ao gerar preview", error);
      throw new Error(`Não foi possível abrir o arquivo. ${normalized.message}`);
    }
    return data.signedUrl;
  },
  async list() {
    const { data, error } = await client().from("uploaded_files").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as UploadedFileRow[];
  },
  async remove(row: UploadedFileRow) {
    await client().storage.from(row.storage_bucket).remove([row.storage_path]);
    const { error } = await client().from("uploaded_files").delete().eq("id", row.id);
    if (error) throw error;
  }
};

export const statuses: OrderStatus[] = ["Novo", "Separando", "Pronto", "Finalizado", "Recebido", "Pendente", "Divergente", "Em concilia\u00e7\u00e3o", "Cancelado"];

