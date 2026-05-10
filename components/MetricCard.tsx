import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-50 text-brand-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700"
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  tone
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon size={20} />
        </span>
      </div>
    </section>
  );
}
