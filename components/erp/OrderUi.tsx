"use client";

import { AlertCircle, Bike, Box, Camera, CheckCircle2, Clock3, FileText, MoreHorizontal, PenLine, Package, Timer } from "lucide-react";
import type { OrderRow, OperationStage } from "@/lib/database.types";
import { currency, cn } from "@/lib/utils";

export function platformName(order: OrderRow) {
  return order.platforms?.name ?? "Sem plataforma";
}

export function orderProducts(order: OrderRow) {
  return order.products_description || order.order_items?.map((item) => item.name).join(", ") || "Produtos nao informados";
}

export function orderQty(order: OrderRow) {
  return order.order_items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 1;
}

export function stageFor(order: OrderRow): OperationStage {
  if (order.operation_stage) return order.operation_stage;
  if (order.status === "Separando") return "Separando";
  if (order.status === "Pronto" || order.status === "Finalizado" || order.status === "Recebido") return "Pronto";
  return "Novo";
}

export function SmallBadge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "yellow" | "green" | "red" | "purple" | "blue" }) {
  const tones = {
    slate: "bg-[#f1f3f7] text-[#071124]",
    yellow: "bg-[#fff4cc] text-[#b65d00] border border-[#ffd66b]",
    green: "bg-[#dff9ed] text-[#087a4a]",
    red: "bg-[#ffe4e4] text-[#c62828]",
    purple: "bg-[#efe9ff] text-[#6d28d9]",
    blue: "bg-[#e7efff] text-[#1255d8]"
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>{children}</span>;
}

export function OperationOrderCard({ order, onClick, onAdvance }: { order: OrderRow; onClick: () => void; onAdvance?: () => void }) {
  return (
    <article className="w-full rounded-xl border border-[#f2c84b] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button onClick={onClick} className="w-full text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-black text-[#071124]">
            <Bike size={14} className="text-[#4f5df5]" />
            {order.order_number}
          </p>
          <p className="mt-1 truncate text-xs text-[#667085]">{order.customer_name}</p>
        </div>
        <SmallBadge tone="purple">{platformName(order)}</SmallBadge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-lg font-black text-[#071124]">{currency(Number(order.net_amount))}</p>
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle size={14} className="text-[#ff4d4f]" />
          <span className="inline-flex items-center gap-1 text-[#ef6c00]"><Clock3 size={13} />{order.deadline_days ?? 3}d</span>
        </div>
      </div>
      </button>
      {onAdvance && (
        <button className="mt-3 w-full rounded-lg bg-[#f6f7fb] px-3 py-2 text-xs font-black text-[#4f5df5] hover:bg-[#e8ebff]" onClick={onAdvance}>
          Avançar status
        </button>
      )}
    </article>
  );
}

export function GridOrderCard({
  order,
  onOpen,
  onEdit,
  onDelivery,
  onStatus,
  onCancel,
  onDelete
}: {
  order: OrderRow;
  onOpen: () => void;
  onEdit?: () => void;
  onDelivery: (delivery: string) => void;
  onStatus?: (status: string) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const hasDiscount = Number(order.gross_amount) > Number(order.net_amount);
  return (
    <article className="rounded-2xl border border-[#e8ecf3] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onOpen} className="truncate text-left text-base font-black text-[#071124] hover:text-[#4f5df5]">{order.order_number}</button>
            <SmallBadge tone={order.status === "Recebido" || order.status === "Finalizado" ? "green" : order.status === "Cancelado" ? "red" : "yellow"}>{order.status}</SmallBadge>
            <SmallBadge>{platformName(order)}</SmallBadge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <SmallBadge tone={stageFor(order) === "Pronto" ? "green" : stageFor(order) === "Separando" ? "blue" : "red"}>📷 !</SmallBadge>
            <SmallBadge>{stageFor(order)}</SmallBadge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-[#071124]">{currency(Number(order.net_amount))}</p>
          {hasDiscount && <p className="text-xs text-[#667085] line-through">{currency(Number(order.gross_amount))}</p>}
        </div>
      </div>

      <p className="mt-3 truncate text-sm text-[#5b6475]">{order.customer_name}</p>
      <p className="mt-1 line-clamp-1 text-sm text-[#5b6475]">{orderProducts(order)}</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-[#5b6475]">Entrega:</span>
        <select
          className="h-9 min-w-44 rounded-xl border border-[#dfe3ee] bg-[#f7f9fc] px-3 text-sm text-[#344054] outline-none focus:border-[#4f5df5]"
          value={order.delivery_method ?? ""}
          onChange={(event) => onDelivery(event.target.value)}
        >
          <option value="">Aguardando</option>
          <option value="iFood">iFood</option>
          <option value="Motoboy">Motoboy</option>
          <option value="Retirado">Retirado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#edf0f5] pt-3 text-sm">
        <span className="inline-flex items-center gap-1 font-bold"><Package size={15} />{orderQty(order)}x</span>
        <button className="inline-flex items-center gap-1 text-[#7c2dff]"><PenLine size={16} />Assinar</button>
        <button className="inline-flex items-center gap-1 text-[#1255ff]"><FileText size={16} />Papeleta</button>
        <select className="h-8 rounded-lg border border-[#dfe3ee] bg-white px-2 text-xs" value={order.status} onChange={(event) => onStatus?.(event.target.value)}>
          {["Novo", "Separando", "Pronto", "Finalizado", "Recebido", "Pendente", "Divergente", "Cancelado"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="rounded-lg px-2 py-1 text-xs font-bold text-[#4f5df5] hover:bg-[#eef0ff]" onClick={onEdit}>Editar</button>
        <button className="rounded-lg px-2 py-1 text-xs font-bold text-[#d66b00] hover:bg-[#fff4e5]" onClick={onCancel}>Cancelar</button>
        <button className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50" onClick={onDelete}>Excluir</button>
      </div>
    </article>
  );
}

export function Timeline({ stage }: { stage: OperationStage | string }) {
  const items = ["Recebido", "Separando", "Separado", "Saiu", "Finalizado"];
  const activeIndex = stage === "Novo" ? 0 : stage === "Separando" ? 1 : stage === "Pronto" ? 2 : 4;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item} className={cn("flex items-center gap-3 text-sm", index <= activeIndex ? "font-bold text-[#4f5df5]" : "text-[#c4cad5]")}>
          <span className={cn("h-3 w-3 rounded-full", index <= activeIndex ? "bg-[#4f5df5]" : "bg-[#e4e8ef]")} />
          {item}
        </div>
      ))}
    </div>
  );
}

export const orderIcons = { Camera, Box, Timer, CheckCircle2 };
