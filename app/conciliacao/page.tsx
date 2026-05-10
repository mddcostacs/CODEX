"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock3 } from "lucide-react";
import { SmallBadge, platformName } from "@/components/erp/OrderUi";
import { useAsyncData } from "@/hooks/useAsyncData";
import { orderService } from "@/lib/services";
import { currency } from "@/lib/utils";

export default function ConciliacaoPage() {
  const [month, setMonth] = useState(new Date());
  const [bankTotal, setBankTotal] = useState("");
  const [receivedValues, setReceivedValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const { data: orders = [], loading, error, reload } = useAsyncData(() => orderService.list(), []);
  const receivables = orders.filter((order) => ["Finalizado", "Recebido", "Divergente"].includes(order.status));
  const received = receivables.filter((order) => order.status === "Recebido");
  const pending = receivables.filter((order) => order.status !== "Recebido");
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  async function confirm(orderId: string, expected: number) {
    const raw = receivedValues[orderId];
    const receivedAmount = raw ? Number(raw) : expected;
    const status = Math.abs(receivedAmount - expected) > 0.009 ? "Divergente" : "Recebido";
    try {
      await orderService.update(orderId, { status, operation_stage: "Pronto" });
      setMessage(status === "Recebido" ? "Recebimento confirmado." : "Divergência marcada pelo valor informado.");
      reload();
    } catch (err) {
      console.error("[ERP Pedidos] Falha na conciliação", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível confirmar o recebimento.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-3xl font-black text-[#071124]">Conciliação Financeira</h1>
        <p className="mt-1 text-[#5b6475]">Confirme os valores recebidos conforme seu extrato bancário</p>
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-4">
        <button className="h-11 rounded-xl border border-[#dfe3ee] bg-white shadow-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="mx-auto" size={18} /></button>
        <h2 className="text-center text-2xl font-black capitalize">{monthLabel}</h2>
        <button className="h-11 rounded-xl border border-[#dfe3ee] bg-white shadow-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="mx-auto" size={18} /></button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Summary label="A Receber" value={currency(receivables.reduce((s, o) => s + Number(o.net_amount), 0))} />
        <Summary label="Recebido" value={currency(received.reduce((s, o) => s + Number(o.net_amount), 0))} green />
        <Summary label="Pendente" value={currency(pending.reduce((s, o) => s + Number(o.net_amount), 0))} amber />
      </div>

      <section className="rounded-2xl border border-[#dfe3ee] bg-white p-5 shadow-sm">
        <label className="text-sm font-bold text-[#5b6475]">Confronto com Extrato Bancário</label>
        <input className="mt-3 h-12 w-full rounded-xl border border-[#dfe3ee] px-4 outline-none focus:border-[#4f5df5]" placeholder="R$ Digite o total do extrato" value={bankTotal} onChange={(event) => setBankTotal(event.target.value)} />
      </section>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando recebíveis...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}

      <div className="space-y-3">
        {receivables.map((order) => {
          const confirmed = order.status === "Recebido";
          return (
            <article key={order.id} className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between ${confirmed ? "border-[#8df0c0] bg-[#edfff6]" : "border-[#edf0f5] bg-white"}`}>
              <div className="flex items-center gap-4">
                {confirmed ? <CheckCircle2 className="text-[#00aa72]" /> : <Clock3 className="text-[#f6a700]" />}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{order.order_number}</p>
                    <SmallBadge>{platformName(order)}</SmallBadge>
                    <span className="text-xs text-[#667085]">Parcela 1/{order.installments ?? 1}</span>
                  </div>
                  <p className="text-sm text-[#667085]">{order.customer_name}</p>
                  <p className="text-sm text-[#667085]">Vence: {new Date(order.ordered_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-xl font-black">{currency(Number(order.net_amount))}</p>
                <p className={`text-sm ${confirmed ? "text-[#00aa72]" : "text-[#d66b00]"}`}>{confirmed ? "✓ Confirmado" : order.status === "Divergente" ? "Divergente" : "Pendente"}</p>
                {!confirmed && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <input className="h-9 w-32 rounded-lg border border-[#dfe3ee] px-3 text-sm" placeholder="Recebido" value={receivedValues[order.id] ?? ""} onChange={(event) => setReceivedValues({ ...receivedValues, [order.id]: event.target.value })} />
                    <button className="rounded-lg bg-[#4f5df5] px-3 py-2 text-xs font-bold text-white" onClick={() => confirm(order.id, Number(order.net_amount))}>Confirmar</button>
                    <button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800" onClick={async () => { await orderService.update(order.id, { status: "Divergente" }); reload(); }}>Divergência</button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!loading && !error && receivables.length === 0 && <div className="rounded-2xl border border-dashed border-[#d8deea] bg-white p-12 text-center text-[#667085]">Nenhum recebível no período</div>}
      </div>
    </div>
  );
}

function Summary({ label, value, green, amber }: { label: string; value: string; green?: boolean; amber?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 text-center shadow-sm ${green ? "bg-[#ecfff6]" : amber ? "bg-[#fff9e6]" : "bg-white"}`}>
      <p className="text-sm text-[#667085]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${green ? "text-[#009966]" : amber ? "text-[#c45d00]" : "text-[#071124]"}`}>{value}</p>
    </div>
  );
}
