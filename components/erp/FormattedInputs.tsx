"use client";

function digitsToDecimalString(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toFixed(2);
}

function formatCurrency(value: string) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatPercent(value: string) {
  const numeric = Number(value || 0);
  return `${(Number.isFinite(numeric) ? numeric : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      inputMode="numeric"
      value={value ? formatCurrency(value) : ""}
      placeholder={placeholder ?? "R$ 0,00"}
      onChange={(event) => onChange(digitsToDecimalString(event.target.value))}
    />
  );
}

export function PercentInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      inputMode="numeric"
      value={value ? formatPercent(value) : ""}
      placeholder={placeholder ?? "0,00%"}
      onChange={(event) => onChange(digitsToDecimalString(event.target.value))}
    />
  );
}
