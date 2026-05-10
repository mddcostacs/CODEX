import { NextResponse } from "next/server";
import { requestIfoodUserCode } from "@/lib/ifood/server";

export async function POST() {
  try {
    const data = await requestIfoodUserCode();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[ERP Pedidos] Falha ao iniciar auth iFood", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar código iFood." }, { status: 400 });
  }
}
