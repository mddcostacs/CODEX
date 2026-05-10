import { NextResponse } from "next/server";
import { exchangeIfoodAuthorizationCode } from "@/lib/ifood/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authorizationCode = String(body.authorizationCode ?? body.authorization_code ?? "");
    const authorizationCodeVerifier = String(body.authorizationCodeVerifier ?? body.authorization_code_verifier ?? "");
    if (!authorizationCode || !authorizationCodeVerifier) {
      return NextResponse.json({ error: "Informe authorizationCode e authorizationCodeVerifier." }, { status: 400 });
    }
    const data = await exchangeIfoodAuthorizationCode(authorizationCode, authorizationCodeVerifier);
    return NextResponse.json({
      message: "Token iFood gerado. Copie accessToken e refreshToken para o .env.local do servidor.",
      data
    });
  } catch (error) {
    console.error("[ERP Pedidos] Falha ao concluir auth iFood", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível concluir autorização iFood." }, { status: 400 });
  }
}
