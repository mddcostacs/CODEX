"use client";

import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import { orderProducts, platformName } from "@/components/erp/OrderUi";
import type { OrderRow } from "@/lib/database.types";
import { currency } from "@/lib/utils";

export function PapeletaModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  return (
    <ErpModal title="Papeleta do Pedido" onClose={onClose} footer={<ErpButton className="w-full" onClick={() => window.print()}>Imprimir papeleta</ErpButton>}>
      <section className="rounded-2xl border border-[#dfe3ee] bg-white p-5 print:border-0">
        <div className="border-b border-dashed border-[#98a2b3] pb-4">
          <p className="text-xs font-bold uppercase text-[#667085]">ERP Pedidos</p>
          <h2 className="mt-1 text-2xl font-black">{order.order_number}</h2>
          <p className="text-sm text-[#667085]">{platformName(order)}</p>
        </div>
        <div className="space-y-3 py-4 text-sm">
          <p><b>Cliente:</b> {order.customer_name}</p>
          <p><b>Produtos:</b> {orderProducts(order)}</p>
          <p><b>Entrega:</b> {order.delivery_method || "Aguardando"}</p>
          <p><b>Observações:</b> {order.notes || "-"}</p>
        </div>
        <div className="border-t border-dashed border-[#98a2b3] pt-4">
          <p className="text-xl font-black">{currency(Number(order.net_amount))}</p>
        </div>
      </section>
    </ErpModal>
  );
}
