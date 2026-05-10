import { NextResponse } from "next/server";
import { importIfoodOrders } from "@/lib/ifood/server";
import { createRequestSupabase } from "@/lib/serverSupabase";

export async function POST(request: Request) {
  try {
    const supabase = createRequestSupabase(request);
    const result = await importIfoodOrders(supabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERP Pedidos] Falha ao importar pedidos iFood", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível importar pedidos do iFood." }, { status: 400 });
  }
}
