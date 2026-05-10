import { NextResponse } from "next/server";
import { parseReceiptTextWithGemini, parseReceiptWithGemini } from "@/lib/geminiVisionParser";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const text = typeof body.text === "string" ? body.text : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!imageBase64 && !text.trim()) {
      return NextResponse.json({ error: "Envie imageBase64 ou text para processar." }, { status: 400 });
    }

    const result = imageBase64 ? await parseReceiptWithGemini(imageBase64, mimeType) : await parseReceiptTextWithGemini(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ERP Pedidos] Falha no parser IA", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar recibo com IA." }, { status: 400 });
  }
}
