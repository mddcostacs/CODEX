"use client";

import { useState } from "react";
import { Camera, DownloadCloud, Grid2X2, Plus } from "lucide-react";
import { ErpButton } from "@/components/erp/ErpButton";
import { NewOrderModal } from "@/components/erp/NewOrderModal";
import { HubLaunchModal } from "@/components/erp/HubLaunchModal";
import { OperationOrderCard, stageFor } from "@/components/erp/OrderUi";
import { OrderDetailModal } from "@/components/erp/OrderDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncData } from "@/hooks/useAsyncData";
import { orderService, platformService } from "@/lib/services";
import type { OperationStage, OrderRow } from "@/lib/database.types";

const columns: { stage: OperationStage; title: string; header: string; body: string; border: string }[] = [
  { stage: "Novo", title: "Novo", header: "bg-[#e4eaf3]", body: "bg-white/35", border: "border-[#cbd5e1]" },
  { stage: "Separando", title: "Separando", header: "bg-[#bfdbfe]", body: "bg-[#eff6ff]", border: "border-[#93c5fd]" },
  { stage: "Pronto", title: "Pronto ✓", header: "bg-[#a7f3d0]", body: "bg-[#ecfdf5]", border: "border-[#6ee7b7]" }
];

export default function OperacaoPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [message, setMessage] = useState("");
  const [importingIfood, setImportingIfood] = useState(false);
  const { session } = useAuth();
  const { data: orders = [], loading, error, reload } = useAsyncData(() => orderService.list(), []);
  const { data: platforms = [] } = useAsyncData(() => platformService.list(), []);
  const running = orders.filter((order) => stageFor(order) !== "Pronto" || order.status !== "Finalizado");

  async function importIfoodOrders() {
    setMessage("");
    setImportingIfood(true);
    try {
      const response = await fetch("/api/ifood/orders/import", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível importar pedidos do iFood.");
      setMessage(`iFood: ${result.imported ?? 0} pedido(s) importado(s), ${result.skipped ?? 0} ignorado(s).`);
      reload();
    } catch (err) {
      console.error("[ERP Pedidos] Importação iFood falhou", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível importar pedidos do iFood.");
    } finally {
      setImportingIfood(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#071124]">Operação</h1>
          <p className="mt-1 text-sm text-[#5b6475]">{running.length} pedidos em andamento</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ErpButton variant="outline" icon={Camera} onClick={() => setUploadOpen(true)}>Importar Foto</ErpButton>
          <ErpButton variant="outline" icon={DownloadCloud} onClick={importIfoodOrders}>{importingIfood ? "Importando..." : "Importar iFood"}</ErpButton>
          <ErpButton variant="outline" icon={Grid2X2} onClick={() => setHubOpen(true)}>Lançar HUB</ErpButton>
          <ErpButton icon={Plus} onClick={() => setNewOpen(true)}>Novo Pedido</ErpButton>
        </div>
      </div>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando pedidos...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d8deea] bg-white p-10 text-center text-[#667085]">
          Nenhum pedido em operação. Use “Novo Pedido”, “Lançar HUB” ou “Importar Foto” para começar.
        </div>
      )}

      <div className="table-scroll -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="grid min-h-[calc(100vh-145px)] min-w-[920px] gap-3 xl:grid-cols-3">
          {columns.map((column) => {
            const columnOrders = orders.filter((order) => stageFor(order) === column.stage);
            return (
              <section key={column.stage} className="flex min-h-[520px] flex-col">
                <div className={`mb-2 flex h-10 items-center justify-between rounded-xl px-4 ${column.header}`}>
                  <h2 className="text-sm font-black text-[#071124]">{column.title}</h2>
                  <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-black text-[#4f5df5]">{columnOrders.length}</span>
                </div>
                <div className={`flex-1 space-y-3 rounded-2xl border border-dashed p-3 ${column.border} ${column.body}`}>
                  {columnOrders.map((order) => (
                    <OperationOrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelected(order)}
                      onAdvance={async () => {
                        const next = stageFor(order) === "Novo" ? "Separando" : "Pronto";
                        await orderService.update(order.id, { operation_stage: next, status: next });
                        reload();
                      }}
                    />
                  ))}
                  {columnOrders.length === 0 && <div className="flex h-32 items-center justify-center text-sm text-[#98a2b3]">Sem pedidos nesta etapa</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {newOpen && <NewOrderModal platforms={platforms} onClose={() => setNewOpen(false)} onSaved={reload} />}
      {hubOpen && <HubLaunchModal platforms={platforms} onClose={() => setHubOpen(false)} onSaved={() => { setMessage("Pedido criado pelo HUB."); setHubOpen(false); reload(); }} />}
      {uploadOpen && <HubLaunchModal title="Importar Foto" platforms={platforms} onClose={() => setUploadOpen(false)} onSaved={() => { setMessage("Pedido criado a partir da foto."); setUploadOpen(false); reload(); }} />}
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </div>
  );
}
