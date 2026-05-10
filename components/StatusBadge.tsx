import { cn } from "@/lib/utils";

const statusClass: Record<string, string> = {
  Recebido: "bg-brand-50 text-brand-700 ring-brand-100",
  Pendente: "bg-amber-50 text-amber-700 ring-amber-100",
  Divergente: "bg-red-50 text-red-700 ring-red-100",
  "Em conciliação": "bg-sky-50 text-sky-700 ring-sky-100",
  admin: "bg-ink text-white ring-ink",
  financeiro: "bg-brand-50 text-brand-700 ring-brand-100",
  operador: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass[status] ?? "bg-slate-100 text-slate-700 ring-slate-200")}>
      {status}
    </span>
  );
}
