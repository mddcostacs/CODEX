"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import { MoneyInput, PercentInput } from "@/components/erp/FormattedInputs";
import { useAsyncData } from "@/hooks/useAsyncData";
import { platformService } from "@/lib/services";
import type { PlatformRow } from "@/lib/database.types";
import { currency, percent } from "@/lib/utils";

export default function PlatformsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformRow | null>(null);
  const [message, setMessage] = useState("");
  const { data: platforms = [], loading, error, reload } = useAsyncData(() => platformService.list(), []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#071124]">Plataformas</h1>
          <p className="mt-1 text-[#5b6475]">Gerencie seus canais de venda e taxas</p>
        </div>
        <ErpButton icon={Plus} onClick={() => setOpen(true)}>Nova Plataforma</ErpButton>
      </div>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando plataformas...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}

      {!loading && !error && platforms.length === 0 && (
        <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
          <Building2 size={46} className="text-[#b8bfcc]" />
          <h2 className="mt-5 text-xl text-[#5b6475]">Nenhuma plataforma cadastrada</h2>
          <p className="mt-2 text-sm text-[#667085]">Adicione suas plataformas de venda para começar</p>
        </div>
      )}

      {platforms.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {platforms.map((platform) => (
            <article key={platform.id} className="rounded-2xl border border-[#e8ecf3] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{platform.name}</h2>
                  <p className="text-sm text-[#667085]">{platform.type || "Canal de venda"} · {platform.active ? "Ativa" : "Inativa"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg px-3 py-2 text-xs font-bold text-[#4f5df5] hover:bg-[#eef0ff]" onClick={() => setEditing(platform)}>Editar</button>
                  <button
                    className="rounded-lg px-3 py-2 text-xs font-bold text-[#d66b00] hover:bg-[#fff4e5]"
                    onClick={async () => {
                      try {
                        await platformService.update(platform.id, { active: !platform.active });
                        reload();
                      } catch (err) {
                        console.error("[ERP Pedidos] Falha ao desativar plataforma", err);
                        setMessage(err instanceof Error ? err.message : "Não foi possível alterar a plataforma.");
                      }
                    }}
                  >
                    {platform.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label="Comissão" value={percent(Number(platform.percent_fee))} />
                <Info label="Taxa fixa" value={currency(Number(platform.fixed_fee))} />
                <Info label="Repasse" value={`${platform.payout_days} dias`} />
                <Info label="Entrega" value={platform.delivery_type || "-"} />
              </div>
            </article>
          ))}
        </div>
      )}

      {open && <PlatformModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
      {editing && <PlatformModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function PlatformModal({ initial, onClose, onSaved }: { initial?: PlatformRow; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "",
    percent_fee: initial?.percent_fee ? String(initial.percent_fee) : "",
    transaction_fee: initial?.transaction_fee ? String(initial.transaction_fee) : "",
    logistics_fee: initial?.logistics_fee ? String(initial.logistics_fee) : "",
    advance_fee: initial?.advance_fee ? String(initial.advance_fee) : "",
    fixed_fee: initial?.fixed_fee ? String(initial.fixed_fee) : "",
    monthly_fee: initial?.monthly_fee ? String(initial.monthly_fee) : "",
    payout_days: initial?.payout_days ? String(initial.payout_days) : "",
    delivery_type: initial?.delivery_type ?? "",
    notes: initial?.notes ?? ""
  });

  async function save() {
    setError("");
    try {
      const payload = {
        name: form.name,
        type: form.type,
        percent_fee: Number(form.percent_fee || 0),
        transaction_fee: Number(form.transaction_fee || 0),
        logistics_fee: Number(form.logistics_fee || 0),
        advance_fee: Number(form.advance_fee || 0),
        fixed_fee: Number(form.fixed_fee || 0),
        monthly_fee: Number(form.monthly_fee || 0),
        payout_days: Number(form.payout_days || 0),
        delivery_type: form.delivery_type,
        notes: form.notes,
        active: initial?.active ?? true
      };
      if (initial) await platformService.update(initial.id, payload);
      else await platformService.create(payload);
      onSaved();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao salvar plataforma", err);
      setError(err instanceof Error ? err.message : "Não foi possível salvar a plataforma.");
    }
  }

  return (
    <ErpModal title={initial ? "Editar Plataforma" : "Nova Plataforma"} wide onClose={onClose} footer={<ErpButton className="w-full" onClick={save}>{initial ? "Salvar plataforma" : "Criar plataforma"}</ErpButton>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da plataforma"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Tipo"><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></Field>
        <h3 className="text-sm font-black text-[#667085] md:col-span-2">Taxas (%)</h3>
        <Field label="Comissão %"><PercentInput value={form.percent_fee} onChange={(value) => setForm({ ...form, percent_fee: value })} /></Field>
        <Field label="Taxa de transação %"><PercentInput value={form.transaction_fee} onChange={(value) => setForm({ ...form, transaction_fee: value })} /></Field>
        <Field label="Taxa logística %"><PercentInput value={form.logistics_fee} onChange={(value) => setForm({ ...form, logistics_fee: value })} /></Field>
        <Field label="Saque antecipado %"><PercentInput value={form.advance_fee} onChange={(value) => setForm({ ...form, advance_fee: value })} /></Field>
        <h3 className="text-sm font-black text-[#667085] md:col-span-2">Valores fixos</h3>
        <Field label="Taxa fixa R$"><MoneyInput value={form.fixed_fee} onChange={(value) => setForm({ ...form, fixed_fee: value })} /></Field>
        <Field label="Mensalidade R$"><MoneyInput value={form.monthly_fee} onChange={(value) => setForm({ ...form, monthly_fee: value })} /></Field>
        <h3 className="text-sm font-black text-[#667085] md:col-span-2">Operacional</h3>
        <Field label="Prazo de repasse"><input type="number" value={form.payout_days} onChange={(e) => setForm({ ...form, payout_days: e.target.value })} /></Field>
        <Field label="Tipo de entrega"><input value={form.delivery_type} onChange={(e) => setForm({ ...form, delivery_type: e.target.value })} /></Field>
        <Field label="Observações" full><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">{error}</p>}
      </div>
    </ErpModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f6f7fb] p-3"><p className="text-xs text-[#667085]">{label}</p><p className="font-black">{value}</p></div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`space-y-2 text-sm font-medium text-[#071124] ${full ? "md:col-span-2" : ""}`}>
      <span>{label}</span>
      <div className="[&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#dfe3ee] [&_input]:px-4 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#dfe3ee] [&_textarea]:px-4 [&_textarea]:py-3">{children}</div>
    </label>
  );
}
