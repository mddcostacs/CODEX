import { currency } from "@/lib/utils";

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[130px_1fr_110px] items-center gap-3 text-sm">
          <span className="font-medium text-ink">{item.label}</span>
          <span className="h-3 rounded-full bg-slate-100">
            <span
              className="block h-3 rounded-full bg-brand-600"
              style={{ width: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }}
            />
          </span>
          <span className="text-right text-muted">{currency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}
