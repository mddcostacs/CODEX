"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ErpButton } from "@/components/erp/ErpButton";
import { NewOrderModal } from "@/components/erp/NewOrderModal";
import { GridOrderCard } from "@/components/erp/OrderUi";
import { OrderDetailModal } from "@/components/erp/OrderDetailModal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { orderService, platformService, statuses } from "@/lib/services";
import type { OrderRow, OrderStatus } from "@/lib/database.types";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [message, setMessage] = useState("");
  const { data: platforms = [] } = useAsyncData(() => platformService.list(), []);
  const { data: orders = [], loading, error, reload } = useAsyncData(() => orderService.list({ search, platformId: platform, status }), [search, platform, status]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#071124]">Pedidos</h1>
          <p className="mt-1 text-base text-[#5b6475]">{orders.length} pedidos registrados</p>
        </div>
        <ErpButton icon={Plus} onClick={() => setNewOpen(true)}>Novo Pedido</ErpButton>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_185px_170px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a8495]" size={20} />
          <input className="h-12 w-full rounded-xl border border-[#dfe3ee] bg-white pl-12 pr-4 shadow-sm outline-none focus:border-[#4f5df5]" placeholder="Buscar pedido, cliente..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="h-12 rounded-xl border border-[#dfe3ee] bg-white px-4 shadow-sm outline-none focus:border-[#4f5df5]" value={platform} onChange={(event) => setPlatform(event.target.value)}>
          <option value="">Todas</option>
          {platforms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="h-12 rounded-xl border border-[#dfe3ee] bg-white px-4 shadow-sm outline-none focus:border-[#4f5df5]" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          {["Novo", "Separando", "Pronto", "Finalizado", "Pendente", "Recebido", "Cancelado"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando pedidos...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}
      {!loading && orders.length === 0 && <div className="rounded-2xl border border-dashed border-[#d8deea] bg-white p-12 text-center text-[#667085]">Nenhum pedido encontrado</div>}

      <div className="grid gap-4 xl:grid-cols-3">
        {orders.map((order) => (
          <GridOrderCard
            key={order.id}
            order={order}
            onOpen={() => setSelected(order)}
            onEdit={() => setEditing(order)}
            onDelivery={async (delivery) => {
              try {
                await orderService.update(order.id, { delivery_method: delivery, status: delivery === "Cancelado" ? "Cancelado" : order.status });
                reload();
              } catch (err) {
                console.error("[ERP Pedidos] Falha ao alterar entrega", err);
                setMessage(err instanceof Error ? err.message : "Não foi possível alterar a entrega.");
              }
            }}
            onStatus={async (nextStatus) => {
              try {
                const status = statuses.includes(nextStatus as OrderStatus) ? nextStatus as OrderStatus : order.status;
                await orderService.update(order.id, {
                  status,
                  operation_stage: status === "Separando" ? "Separando" : status === "Pronto" || status === "Finalizado" || status === "Recebido" ? "Pronto" : "Novo"
                });
                reload();
              } catch (err) {
                console.error("[ERP Pedidos] Falha ao atualizar status", err);
                setMessage(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
              }
            }}
            onCancel={async () => {
              await orderService.update(order.id, { status: "Cancelado" });
              reload();
            }}
            onDelete={async () => {
              await orderService.remove(order.id);
              reload();
            }}
          />
        ))}
      </div>

      {newOpen && <NewOrderModal platforms={platforms} onClose={() => setNewOpen(false)} onSaved={reload} />}
      {editing && <NewOrderModal platforms={platforms} order={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </div>
  );
}
