"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { platformName } from "@/components/erp/OrderUi";
import { useAsyncData } from "@/hooks/useAsyncData";
import { orderService } from "@/lib/services";
import { currency } from "@/lib/utils";

const tabs = ["A Receber", "Recebidos", "Diverg.", "Cancelados"];

export default function FinanceiroPage() {
  const [tab, setTab] = useState("A Receber");
  const { data: orders = [], loading, error } = useAsyncData(() => orderService.list(), []);
  const finalized = orders.filter((order) => order.status === "Finalizado" || order.status === "Recebido" || order.status === "Divergente");
  const received = finalized.filter((order) => order.status === "Recebido");
  const pending = finalized.filter((order) => order.status === "Finalizado");
  const divergences = finalized.filter((order) => order.status === "Divergente");
  const canceled = orders.filter((order) => order.status === "Cancelado");
  const visible = useMemo(() => {
    if (tab === "Recebidos") return received;
    if (tab === "Diverg.") return divergences;
    if (tab === "Cancelados") return canceled;
    return pending;
  }, [tab, pending, received, divergences, canceled]);
  const totalFees = finalized.reduce((sum, order) => sum + Number(order.fees_amount), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-black text-[#071124]">Financeiro</h1>
        <p className="mt-1 text-[#5b6475]">Controle de recebimentos e conciliação</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#ffd66b] bg-[#fffbea] px-4 py-3 text-sm text-[#c45d00]">
        <AlertCircle size={17} /> Apenas pedidos com status <b>Finalizado</b> aparecem aqui.
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <FinanceCard label="A Receber" value={currency(pending.reduce((sum, order) => sum + Number(order.net_amount), 0))} tone="amber" />
        <FinanceCard label="Recebido" value={currency(received.reduce((sum, order) => sum + Number(order.net_amount), 0))} tone="green" />
        <FinanceCard label="Total Taxas" value={currency(totalFees)} tone="red" />
        <FinanceCard label="Divergências" value={String(divergences.length)} tone="red" />
      </div>

      <div className="grid grid-cols-4 rounded-2xl bg-[#f1f3f7] p-1 text-sm text-[#5b6475]">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-3 py-2 font-semibold ${tab === item ? "bg-white text-[#071124] shadow-sm" : ""}`}>
            {item} {item === "A Receber" ? pending.length : item === "Recebidos" ? received.length : item === "Diverg." ? divergences.length : canceled.length}
          </button>
        ))}
      </div>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando financeiro...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-7 flex items-center justify-between">
          <p className="text-[#5b6475]">{visible.length} pedidos</p>
          <p className="text-xl font-black">{currency(visible.reduce((sum, order) => sum + Number(order.net_amount), 0))}</p>
        </div>
        <div className="space-y-3">
          {visible.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-xl border border-[#edf0f5] p-4">
              <div>
                <p className="font-black">{order.order_number}</p>
                <p className="text-sm text-[#667085]">{order.customer_name} · {platformName(order)}</p>
              </div>
              <p className="font-black">{currency(Number(order.net_amount))}</p>
            </div>
          ))}
          {visible.length === 0 && <p className="py-12 text-center text-[#5b6475]">Nenhum pendente</p>}
        </div>
      </section>
    </div>
  );
}

function FinanceCard({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-[#009966]" : tone === "red" ? "text-[#ff3b3b]" : "text-[#d66b00]";
  return (
    <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
      <p className="text-sm text-[#667085]">{label}</p>
      <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
