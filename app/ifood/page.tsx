"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { ErpButton } from "@/components/erp/ErpButton";

type IfoodStatus = {
  clientId: boolean;
  clientSecret: boolean;
  merchantId: boolean;
  accessToken: boolean;
  refreshToken: boolean;
};

export default function IfoodConfigPage() {
  const [status, setStatus] = useState<IfoodStatus | null>(null);
  const [message, setMessage] = useState("");
  const [userCode, setUserCode] = useState<Record<string, unknown> | null>(null);

  async function loadStatus() {
    const response = await fetch("/api/ifood/status");
    setStatus(await response.json());
  }

  async function startAuth() {
    setMessage("");
    setUserCode(null);
    try {
      const response = await fetch("/api/ifood/auth/start", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o código.");
      setUserCode(data);
      setMessage("Código gerado. Autorize no Portal do Parceiro iFood e depois troque o authorizationCode na rota de callback.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a autorização iFood.");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#071124]">Configuração iFood</h1>
          <p className="mt-1 text-sm text-[#5b6475]">Integração somente para leitura/importação de pedidos.</p>
        </div>
        <ErpButton variant="outline" icon={RefreshCw} onClick={loadStatus}>Atualizar status</ErpButton>
      </div>

      <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-sm">
        <h2 className="font-black text-[#071124]">Variáveis no servidor</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["IFOOD_CLIENT_ID", status?.clientId],
            ["IFOOD_CLIENT_SECRET", status?.clientSecret],
            ["IFOOD_MERCHANT_ID", status?.merchantId],
            ["IFOOD_ACCESS_TOKEN", status?.accessToken],
            ["IFOOD_REFRESH_TOKEN", status?.refreshToken]
          ].map(([name, ok]) => (
            <div key={String(name)} className="flex items-center justify-between rounded-xl bg-[#f6f7fb] p-3 text-sm">
              <span className="font-bold text-[#071124]">{name}</span>
              <span className={ok ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{ok ? "Configurado" : "Pendente"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-sm">
        <h2 className="font-black text-[#071124]">Autorização</h2>
        <p className="mt-2 text-sm text-[#5b6475]">
          Gere o código no Developer iFood e autorize no Portal do Parceiro. O ERP usa essa conexão apenas para ler eventos e detalhes de pedidos.
        </p>
        <div className="mt-4">
          <ErpButton icon={KeyRound} onClick={startAuth}>Gerar código de ativação</ErpButton>
        </div>
        {message && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
        {userCode && (
          <pre className="mt-4 overflow-auto rounded-xl bg-[#071124] p-4 text-xs text-white">{JSON.stringify(userCode, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
