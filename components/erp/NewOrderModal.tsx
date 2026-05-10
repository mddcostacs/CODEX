"use client";

import { useState } from "react";
import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import type { OrderRow, PlatformRow } from "@/lib/database.types";
import { orderProducts } from "@/components/erp/OrderUi";
import { orderService } from "@/lib/services";
import { MoneyInput } from "@/components/erp/FormattedInputs";
import { cleanDecimal } from "@/lib/parsers/ifoodReceiptParser";

export function NewOrderModal({
  platforms,
  order,
  initial,
  onClose,
  onSaved
}: {
  platforms: PlatformRow[];
  order?: OrderRow | null;
  initial?: Partial<{
    order_number: string;
    platform_id: string;
    customer_name: string;
    products_description: string;
    gross_amount: string;
    fees_amount: string;
    discount_amount: string;
    other_deductions: string;
  }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order_number: order?.order_number ?? initial?.order_number ?? "",
    platform_id: order?.platform_id ?? initial?.platform_id ?? "",
    customer_name: order?.customer_name ?? initial?.customer_name ?? "",
    ordered_at: order?.ordered_at ? order.ordered_at.slice(0, 10) : today,
    products_description: order ? orderProducts(order) : initial?.products_description ?? "",
    gross_amount: order?.gross_amount ? String(order.gross_amount) : initial?.gross_amount ?? "",
    fees_amount: order?.fees_amount ? String(order.fees_amount) : initial?.fees_amount ?? "",
    discount_amount: order?.discount_amount ? String(order.discount_amount) : initial?.discount_amount ?? "",
    other_deductions: order?.other_deductions ? String(order.other_deductions) : initial?.other_deductions ?? "",
    installments: order?.installments ? String(order.installments) : "1",
    notes: order?.notes ?? ""
  });

  async function save() {
    setError("");
    if (!form.order_number.trim() || !form.customer_name.trim()) {
      setError("Informe pelo menos o número do pedido e o cliente.");
      return;
    }

    setSaving(true);
    try {
      const gross = Number(cleanDecimal(form.gross_amount || 0));
      const fees = Number(cleanDecimal(form.fees_amount || 0));
      const discount = Number(cleanDecimal(form.discount_amount || 0));
      const other = Number(cleanDecimal(form.other_deductions || 0));
      const payload = {
        platform_id: form.platform_id || null,
        order_number: form.order_number,
        customer_name: form.customer_name,
        gross_amount: gross,
        fees_amount: fees,
        net_amount: gross - fees - discount - other,
        status: order?.status ?? "Novo",
        operation_stage: order?.operation_stage ?? "Novo",
        products_description: form.products_description,
        discount_amount: discount,
        other_deductions: other,
        installments: Number(form.installments || 1),
        delivery_method: order?.delivery_method ?? "",
        deadline_days: order?.deadline_days ?? 3,
        notes: form.notes,
        ordered_at: new Date(form.ordered_at).toISOString()
      };

      if (order) {
        await orderService.update(order.id, payload);
      } else {
        await orderService.create(payload, form.products_description.trim() ? [{
          name: form.products_description.trim(),
          quantity: 1,
          unit_price: gross
        }] : []);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao salvar pedido", err);
      setError(err instanceof Error ? err.message : "Não foi possível salvar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ErpModal
      title={order ? "Editar Pedido" : "Adicionar Pedido"}
      wide
      onClose={onClose}
      footer={<ErpButton className="w-full" onClick={save}>{saving ? "Salvando..." : "Salvar Pedido"}</ErpButton>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nº Pedido"><input autoFocus placeholder="#12345" value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} /></Field>
        <Field label="Plataforma *">
          <select value={form.platform_id} onChange={(e) => setForm({ ...form, platform_id: e.target.value })}>
            <option value="">Selecione</option>
            {platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
          </select>
        </Field>
        <Field label="Cliente"><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
        <Field label="Data"><input type="date" value={form.ordered_at} onChange={(e) => setForm({ ...form, ordered_at: e.target.value })} /></Field>
        <Field label="Produtos" full><textarea placeholder="Descreva os produtos..." value={form.products_description} onChange={(e) => setForm({ ...form, products_description: e.target.value })} /></Field>
        <Field label="Valor Bruto *" full><MoneyInput value={form.gross_amount} onChange={(value) => setForm({ ...form, gross_amount: value })} /></Field>
        <Field label="Taxa Plataforma"><MoneyInput value={form.fees_amount} onChange={(value) => setForm({ ...form, fees_amount: value })} /></Field>
        <Field label="Desc. Produto"><MoneyInput value={form.discount_amount} onChange={(value) => setForm({ ...form, discount_amount: value })} /></Field>
        <Field label="Outras Deduções" full><MoneyInput value={form.other_deductions} onChange={(value) => setForm({ ...form, other_deductions: value })} /></Field>
        <Field label="Parcelas"><input type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} /></Field>
        <Field label="Observações" full><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error && <p className="md:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      </div>
    </ErpModal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`space-y-2 text-sm font-medium text-[#071124] ${full ? "md:col-span-2" : ""}`}>
      <span>{label}</span>
      <div className="[&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#dfe3ee] [&_input]:bg-white [&_input]:px-4 [&_input]:outline-none [&_input]:focus:border-[#4f5df5] [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#dfe3ee] [&_select]:bg-white [&_select]:px-4 [&_textarea]:min-h-20 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#dfe3ee] [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:focus:border-[#4f5df5]">
        {children}
      </div>
    </label>
  );
}
