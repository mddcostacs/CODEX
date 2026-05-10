import type { SupabaseClient } from "@supabase/supabase-js";

const IFOOD_BASE_URL = "https://merchant-api.ifood.com.br";

type IfoodEvent = {
  id: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  createdAt?: string;
  metadata?: { id?: string; orderId?: string; [key: string]: unknown };
};

type IfoodOrderDetail = {
  id: string;
  displayId?: string;
  status?: string;
  createdAt?: string;
  salesChannel?: string;
  customer?: { name?: string };
  merchant?: { id?: string; name?: string };
  items?: Array<{
    name?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    observations?: string;
    options?: Array<{ name?: string; quantity?: number; unitPrice?: number; price?: number }>;
  }>;
  total?: {
    subTotal?: number;
    deliveryFee?: number;
    additionalFees?: number;
    benefits?: number;
    orderAmount?: number;
  };
  payments?: { prepaid?: number; pending?: number };
  extraInfo?: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  events: number;
  message?: string;
  refreshedAccessToken?: string;
};

export function ifoodEnvironmentStatus() {
  return {
    clientId: Boolean(process.env.IFOOD_CLIENT_ID),
    clientSecret: Boolean(process.env.IFOOD_CLIENT_SECRET),
    merchantId: Boolean(process.env.IFOOD_MERCHANT_ID),
    accessToken: Boolean(process.env.IFOOD_ACCESS_TOKEN),
    refreshToken: Boolean(process.env.IFOOD_REFRESH_TOKEN)
  };
}

export async function requestIfoodUserCode() {
  const clientId = requiredEnv("IFOOD_CLIENT_ID");
  const response = await ifoodForm("/authentication/v1.0/oauth/userCode", { clientId });
  return response;
}

export async function exchangeIfoodAuthorizationCode(authorizationCode: string, authorizationCodeVerifier: string) {
  const response = await ifoodForm("/authentication/v1.0/oauth/token", {
    grantType: "authorization_code",
    clientId: requiredEnv("IFOOD_CLIENT_ID"),
    clientSecret: requiredEnv("IFOOD_CLIENT_SECRET"),
    authorizationCode,
    authorizationCodeVerifier
  });
  return response;
}

export async function importIfoodOrders(supabase: SupabaseClient): Promise<ImportResult> {
  const merchantId = requiredEnv("IFOOD_MERCHANT_ID");
  let accessToken = requiredEnv("IFOOD_ACCESS_TOKEN");
  let refreshedAccessToken = "";

  let eventsResponse = await ifoodJson("/events/v1.0/events:polling?categories=ALL&types=PLC,PLACED,CONFIRMED", accessToken, {
    "x-polling-merchants": merchantId
  });

  if (eventsResponse.status === 401 && process.env.IFOOD_REFRESH_TOKEN) {
    const refreshed = await refreshIfoodAccessToken();
    accessToken = String(refreshed.accessToken ?? refreshed.access_token ?? "");
    refreshedAccessToken = accessToken;
    eventsResponse = await ifoodJson("/events/v1.0/events:polling?categories=ALL&types=PLC,PLACED,CONFIRMED", accessToken, {
      "x-polling-merchants": merchantId
    });
  }

  if (eventsResponse.status === 204) {
    return { imported: 0, skipped: 0, events: 0, message: "Nenhum evento novo no iFood." };
  }
  if (!eventsResponse.ok) {
    throw new Error(`iFood retornou ${eventsResponse.status}: ${await eventsResponse.text()}`);
  }

  const body = await eventsResponse.json();
  const events = normalizeEvents(body).sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  const placedEvents = events.filter(isNewOrderEvent);
  const platformId = await ensureIfoodPlatform(supabase);
  let imported = 0;
  let skipped = 0;

  for (const event of placedEvents) {
    const orderId = event.orderId ?? event.metadata?.orderId ?? event.metadata?.id;
    if (!orderId) {
      skipped += 1;
      continue;
    }

    const existing = await supabase
      .from("orders")
      .select("id")
      .or(`external_order_id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      skipped += 1;
      continue;
    }

    const detailResponse = await ifoodJson(`/order/v1.0/orders/${orderId}`, accessToken);
    if (!detailResponse.ok) {
      skipped += 1;
      continue;
    }
    const detail = await detailResponse.json() as IfoodOrderDetail;
    const created = await saveIfoodOrder(supabase, platformId, detail, event);
    imported += created ? 1 : 0;
    skipped += created ? 0 : 1;
  }

  if (events.length) {
    await acknowledgeEvents(accessToken, events);
  }

  return { imported, skipped, events: events.length, refreshedAccessToken };
}

async function saveIfoodOrder(supabase: SupabaseClient, platformId: string | null, detail: IfoodOrderDetail, event: IfoodEvent) {
  const orderNumber = detail.displayId || detail.id;
  const duplicate = await supabase
    .from("orders")
    .select("id")
    .or(`external_order_id.eq.${detail.id},order_number.eq.${orderNumber}`)
    .maybeSingle();
  if (duplicate.error) throw duplicate.error;
  if (duplicate.data) return false;

  const totals = detail.total ?? {};
  const feesAmount = money(totals.deliveryFee) + money(totals.additionalFees);
  const discountAmount = money(totals.benefits);
  const grossAmount = money(totals.subTotal) + feesAmount;
  const netAmount = money(totals.orderAmount) || Math.max(0, grossAmount - discountAmount);
  const products = (detail.items ?? []).map(formatItem).filter(Boolean).join("\n");

  const insert = await supabase
    .from("orders")
    .insert({
      platform_id: platformId,
      order_number: orderNumber,
      customer_name: detail.customer?.name || "Cliente iFood",
      gross_amount: grossAmount,
      fees_amount: feesAmount,
      net_amount: netAmount,
      status: "Novo",
      operation_stage: "Novo",
      products_description: products,
      discount_amount: discountAmount,
      other_deductions: 0,
      installments: 1,
      delivery_method: "iFood",
      deadline_days: 3,
      notes: detail.extraInfo ?? "",
      ordered_at: detail.createdAt ?? event.createdAt ?? new Date().toISOString(),
      external_order_id: detail.id,
      raw_payload: detail,
      imported_from: "IFOOD",
      imported_at: new Date().toISOString()
    })
    .select("id")
    .single();
  if (insert.error) throw insert.error;

  const items = (detail.items ?? []).map((item) => ({
    order_id: insert.data.id,
    name: item.name ?? "Item iFood",
    quantity: Number(item.quantity ?? 1),
    unit_price: money(item.unitPrice ?? item.totalPrice)
  }));
  if (items.length) {
    const itemInsert = await supabase.from("order_items").insert(items);
    if (itemInsert.error) throw itemInsert.error;
  }
  return true;
}

async function ensureIfoodPlatform(supabase: SupabaseClient) {
  const existing = await supabase.from("platforms").select("id").ilike("name", "iFood").limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id as string;

  const created = await supabase
    .from("platforms")
    .insert({ name: "iFood", type: "marketplace", percent_fee: 0, fixed_fee: 0, payout_days: 30, active: true })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id as string;
}

function normalizeEvents(body: unknown): IfoodEvent[] {
  if (Array.isArray(body)) return body as IfoodEvent[];
  if (body && typeof body === "object" && "events" in body && Array.isArray((body as { events: unknown }).events)) {
    return (body as { events: IfoodEvent[] }).events;
  }
  return [];
}

function isNewOrderEvent(event: IfoodEvent) {
  const code = `${event.code ?? ""} ${event.fullCode ?? ""}`.toUpperCase();
  return code.includes("PLC") || code.includes("PLACED") || code.includes("CONFIRMED") || code.includes("ORDER_PLACED");
}

function formatItem(item: NonNullable<IfoodOrderDetail["items"]>[number]) {
  const base = `${Number(item.quantity ?? 1)}x ${item.name ?? "Item iFood"}`;
  const options = (item.options ?? []).map((option) => option.name).filter(Boolean).join(", ");
  return options ? `${base} (${options})` : base;
}

function money(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

async function acknowledgeEvents(accessToken: string, events: IfoodEvent[]) {
  try {
    await ifoodJson("/events/v1.0/events/acknowledgment", accessToken, {}, {
      method: "POST",
      body: JSON.stringify(events.map((event) => ({ id: event.id })))
    });
  } catch (error) {
    console.warn("[ERP Pedidos] Não foi possível confirmar eventos do iFood.", error);
  }
}

async function refreshIfoodAccessToken() {
  return ifoodForm("/authentication/v1.0/oauth/token", {
    grantType: "refresh_token",
    clientId: requiredEnv("IFOOD_CLIENT_ID"),
    clientSecret: requiredEnv("IFOOD_CLIENT_SECRET"),
    refreshToken: requiredEnv("IFOOD_REFRESH_TOKEN")
  });
}

async function ifoodForm(path: string, payload: Record<string, string>) {
  const response = await fetch(`${IFOOD_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });
  if (!response.ok) throw new Error(`iFood retornou ${response.status}: ${await response.text()}`);
  return response.json();
}

async function ifoodJson(path: string, accessToken: string, headers: Record<string, string> = {}, init: RequestInit = {}) {
  return fetch(`${IFOOD_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers ?? {})
    }
  });
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configure ${name} no .env.local antes de usar a integração iFood.`);
  return value;
}
