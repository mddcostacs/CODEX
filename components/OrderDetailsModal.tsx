"use client";

import type { OrderRow } from "@/lib/database.types";
import { currency } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { X } from "lucide-react";

export function OrderDetailsModal({ order, onClose }: { order: OrderRow | null; onClose: () => void }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <section className="w-full max-w-2xl rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm text-muted">Detalhes do pedido</p>
            <h2 className="text-xl font-semibold">{order.order_number}</h2>
          </div>
          <button className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Cliente" value={order.customer_name} />
            <Info label="Plataforma" value={order.platforms?.name ?? "Sem plataforma"} />
            <Info label="Data" value={new Date(order.ordered_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })} />
            <div>
              <p className="text-xs uppercase text-muted">Status</p>
              <div className="mt-1"><StatusBadge status={order.status} /></div>
            </div>
          </div>

          <div className="rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-line">
                  <th className="p-3">Item</th>
                  <th>Qtd.</th>
                  <th>Unitário</th>
                </tr>
              </thead>
              <tbody>
                {(order.order_items ?? []).map((item) => (
                  <tr key={item.name} className="border-b border-line last:border-0">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(Number(item.unit_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Info label="Valor bruto" value={currency(Number(order.gross_amount))} />
            <Info label="Taxas" value={currency(Number(order.fees_amount))} />
            <Info label="Valor líquido" value={currency(Number(order.net_amount))} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
